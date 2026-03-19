(function attachRendererState(global) {
  function createElements(doc) {
    if (!doc) {
      return {};
    }

    return {
      themeControl: doc.getElementById('themeControl'),
      headerLoadFavouriteButton: doc.getElementById('headerLoadFavouriteButton'),
      midiDeviceControl: doc.getElementById('midiDeviceControl'),
      midiDeviceButton: doc.getElementById('midiDeviceButton'),
      midiDeviceMenu: doc.getElementById('midiDeviceMenu'),
      midiStatusDot: doc.getElementById('midiStatusDot'),
      midiDeviceName: doc.getElementById('midiDeviceName'),
      midiDeviceStatus: doc.getElementById('midiDeviceStatus'),
      categorySearch: doc.getElementById('categorySearch'),
      categoryList: doc.getElementById('categoryList'),
      categoryCount: doc.getElementById('categoryCount'),
      currentCategory: doc.getElementById('currentCategory'),
      patchCount: doc.getElementById('patchCount'),
      patchSearch: doc.getElementById('patchSearch'),
      selectedPatchCount: doc.getElementById('selectedPatchCount'),
      selectedPatchSaveFavouriteButton: doc.getElementById('selectedPatchSaveFavouriteButton'),
      selectedPatchSortButton: doc.getElementById('selectedPatchSortButton'),
      selectedPatchSendAllButton: doc.getElementById('selectedPatchSendAllButton'),
      patchList: doc.getElementById('patchList'),
      detailsContent: doc.getElementById('detailsContent'),
      patchesLoaded: doc.getElementById('patchesLoaded'),
      lastSent: doc.getElementById('lastSent'),
      appModalBackdrop: doc.getElementById('appModalBackdrop'),
      appModal: doc.getElementById('appModal'),
      appModalForm: doc.getElementById('appModalForm'),
      appModalTitle: doc.getElementById('appModalTitle'),
      appModalMessage: doc.getElementById('appModalMessage'),
      appModalField: doc.getElementById('appModalField'),
      appModalInput: doc.getElementById('appModalInput'),
      appModalFavourites: doc.getElementById('appModalFavourites'),
      appModalError: doc.getElementById('appModalError'),
      appModalCancelButton: doc.getElementById('appModalCancelButton'),
      appModalConfirmButton: doc.getElementById('appModalConfirmButton')
    };
  }

  function normalizeSearchTerm(value) {
    return String(value || '').toLowerCase();
  }

  function buildPatchIdentity(patch) {
    if (!patch || typeof patch !== 'object') {
      return '';
    }

    return [
      patch.category,
      patch.name,
      patch.msb,
      patch.lsb,
      patch.pc
    ].map(value => String(value == null ? '' : value)).join('||');
  }

  function buildPatchCollection(data) {
    const patches = Array.isArray(data)
      ? data.map((patch, index) => ({
        ...patch,
        id: index,
        patchIdentity: buildPatchIdentity(patch)
      }))
      : [];
    const categories = Array.from(new Set(patches.map(patch => patch.category))).sort();
    return { patches, categories };
  }

  function sortFavouriteLists(lists) {
    return [...lists].sort((left, right) => {
      const rightTime = Date.parse(right && right.updatedAt) || 0;
      const leftTime = Date.parse(left && left.updatedAt) || 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return String(left && left.name || '').localeCompare(String(right && right.name || ''));
    });
  }

  function getVisibleCategories(state) {
    const filter = normalizeSearchTerm(state.categorySearchTerm);
    return state.categories.filter(category => category.toLowerCase().includes(filter));
  }

  function getVisiblePatches(state) {
    const search = normalizeSearchTerm(state.patchSearchTerm);

    return state.patches.filter(patch => {
      if (state.selectedCategory && patch.category !== state.selectedCategory) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        patch.name.toLowerCase().includes(search) ||
        patch.category.toLowerCase().includes(search)
      );
    });
  }

  function getSelectedMidiPort(state) {
    return state.midiPorts.find(port => port.id === state.selectedMidiPortId) || null;
  }

  function getSelectedPatches(state) {
    const patchesById = new Map(state.patches.map(patch => [patch.id, patch]));
    return state.selectedPatchIds
      .map(patchId => patchesById.get(patchId))
      .filter(Boolean);
  }

  function getSelectedPatchChannel(state, patchId) {
    return state.selectedPatchChannelsById[String(patchId)] || null;
  }

  function getUsedMidiChannels(state, excludedPatchId) {
    const excludedId = excludedPatchId === undefined ? null : String(excludedPatchId);
    return new Set(
      state.selectedPatchIds
        .filter(patchId => String(patchId) !== excludedId)
        .map(patchId => getSelectedPatchChannel(state, patchId))
        .filter(channel => Number.isInteger(channel))
    );
  }

  function getSelectedPatchAvailableChannels(state, patchId) {
    const availableChannels = new Set();
    const currentChannel = getSelectedPatchChannel(state, patchId);
    const usedByOtherPatches = getUsedMidiChannels(state, patchId);

    for (let channel = 1; channel <= 16; channel += 1) {
      if (channel === currentChannel || !usedByOtherPatches.has(channel)) {
        availableChannels.add(channel);
      }
    }

    return availableChannels;
  }

  function getNextAvailableMidiChannel(state) {
    const usedChannels = getUsedMidiChannels(state);

    for (let channel = 1; channel <= 16; channel += 1) {
      if (!usedChannels.has(channel)) {
        return channel;
      }
    }

    return null;
  }

  function isPatchSelected(state, patchId) {
    return state.selectedPatchIds.includes(patchId);
  }

  function toggleSelectedPatchIds(state, patchId) {
    if (isPatchSelected(state, patchId)) {
      return state.selectedPatchIds.filter(selectedPatchId => selectedPatchId !== patchId);
    }

    return [...state.selectedPatchIds, patchId];
  }

  function isSelectedPatchExpanded(state, patchId) {
    return state.expandedSelectedPatchIds.includes(patchId);
  }

  function toggleSelectedPatchExpanded(state, patchId) {
    if (isSelectedPatchExpanded(state, patchId)) {
      return state.expandedSelectedPatchIds.filter(expandedPatchId => expandedPatchId !== patchId);
    }

    return [...state.expandedSelectedPatchIds, patchId];
  }

  function collapseRemovedSelectedPatch(state, patchId) {
    return state.expandedSelectedPatchIds.filter(expandedPatchId => expandedPatchId !== patchId);
  }

  const elements = createElements(global.document);
  const state = {
    patches: [],
    categories: [],
    selectedCategory: null,
    selectedPatchIds: [],
    expandedSelectedPatchIds: [],
    selectedPatchChannelsById: {},
    savedFavouriteLists: [],
    modal: {
      isOpen: false,
      mode: null,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      inputLabel: 'Favourite name',
      inputValue: '',
      error: '',
      showInput: false,
      showFavourites: false,
      hideConfirm: false,
      targetName: '',
      returnMode: null
    },
    midiConnected: false,
    bulkSendInProgress: false,
    webMidiOutput: null,
    midiRefreshPromise: null,
    lastMidiRefreshSignature: '',
    midiPorts: [],
    selectedMidiPortId: '',
    midiMenuOpen: false,
    midiAccess: null,
    categorySearchTerm: '',
    patchSearchTerm: '',
    themePreference: 'system',
    activeTheme: global.document && global.document.documentElement
      ? (global.document.documentElement.dataset.theme || 'dark')
      : 'dark'
  };

  const app = global.GenosApp || {};
  app.state = state;
  app.elements = elements;
  app.selectors = {
    buildPatchCollection,
    buildPatchIdentity,
    getVisibleCategories: () => getVisibleCategories(state),
    getVisiblePatches: () => getVisiblePatches(state),
    getSelectedMidiPort: () => getSelectedMidiPort(state),
    getSelectedPatches: () => getSelectedPatches(state),
    getSelectedPatchChannel: patchId => getSelectedPatchChannel(state, patchId),
    getUsedMidiChannels: excludedPatchId => getUsedMidiChannels(state, excludedPatchId),
    getSelectedPatchAvailableChannels: patchId => getSelectedPatchAvailableChannels(state, patchId),
    getNextAvailableMidiChannel: () => getNextAvailableMidiChannel(state),
    isPatchSelected: patchId => isPatchSelected(state, patchId),
    isSelectedPatchExpanded: patchId => isSelectedPatchExpanded(state, patchId),
    sortFavouriteLists
  };
  app.selection = {
    toggleSelectedPatchIds: patchId => toggleSelectedPatchIds(state, patchId),
    toggleSelectedPatchExpanded: patchId => toggleSelectedPatchExpanded(state, patchId),
    collapseRemovedSelectedPatch: patchId => collapseRemovedSelectedPatch(state, patchId)
  };
  global.GenosApp = app;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      buildPatchCollection,
      buildPatchIdentity,
      getVisibleCategories,
      getVisiblePatches,
      getSelectedMidiPort,
      getSelectedPatches,
      getSelectedPatchChannel,
      getUsedMidiChannels,
      getSelectedPatchAvailableChannels,
      getNextAvailableMidiChannel,
      isPatchSelected,
      toggleSelectedPatchIds,
      isSelectedPatchExpanded,
      toggleSelectedPatchExpanded,
      collapseRemovedSelectedPatch,
      sortFavouriteLists
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
