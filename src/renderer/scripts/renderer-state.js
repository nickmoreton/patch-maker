(function attachRendererState(global) {
  function createElements(doc) {
    if (!doc) {
      return {};
    }

    return {
      themeControl: doc.getElementById('themeControl'),
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
      patchList: doc.getElementById('patchList'),
      detailsContent: doc.getElementById('detailsContent'),
      patchesLoaded: doc.getElementById('patchesLoaded'),
      lastSent: doc.getElementById('lastSent')
    };
  }

  function normalizeSearchTerm(value) {
    return String(value || '').toLowerCase();
  }

  function buildPatchCollection(data) {
    const patches = Array.isArray(data)
      ? data.map((patch, index) => ({ ...patch, id: index }))
      : [];
    const categories = Array.from(new Set(patches.map(patch => patch.category))).sort();
    return { patches, categories };
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
    midiConnected: false,
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
    getVisibleCategories: () => getVisibleCategories(state),
    getVisiblePatches: () => getVisiblePatches(state),
    getSelectedMidiPort: () => getSelectedMidiPort(state),
    getSelectedPatches: () => getSelectedPatches(state),
    isPatchSelected: patchId => isPatchSelected(state, patchId),
    isSelectedPatchExpanded: patchId => isSelectedPatchExpanded(state, patchId)
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
      getVisibleCategories,
      getVisiblePatches,
      getSelectedMidiPort,
      getSelectedPatches,
      isPatchSelected,
      toggleSelectedPatchIds,
      isSelectedPatchExpanded,
      toggleSelectedPatchExpanded,
      collapseRemovedSelectedPatch
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
