(function attachRendererState(global) {
  function createElements(doc) {
    if (!doc) {
      return {};
    }

    return {
      midiDeviceControl: doc.getElementById('midiDeviceControl'),
      midiDeviceButton: doc.getElementById('midiDeviceButton'),
      midiDeviceMenu: doc.getElementById('midiDeviceMenu'),
      midiStatusDot: doc.getElementById('midiStatusDot'),
      midiDeviceName: doc.getElementById('midiDeviceName'),
      midiDeviceStatus: doc.getElementById('midiDeviceStatus'),
      midiChannel: doc.getElementById('midiChannel'),
      categorySearch: doc.getElementById('categorySearch'),
      categoryList: doc.getElementById('categoryList'),
      categoryCount: doc.getElementById('categoryCount'),
      currentCategory: doc.getElementById('currentCategory'),
      patchCount: doc.getElementById('patchCount'),
      patchSearch: doc.getElementById('patchSearch'),
      patchList: doc.getElementById('patchList'),
      detailsContent: doc.getElementById('detailsContent'),
      patchesLoaded: doc.getElementById('patchesLoaded'),
      lastSent: doc.getElementById('lastSent'),
      selectAllBtn: doc.getElementById('selectAllBtn')
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

  function areAllVisiblePatchesSelected(state) {
    const visiblePatches = getVisiblePatches(state);
    return (
      visiblePatches.length > 0 &&
      visiblePatches.every(patch =>
        state.selectedPatches.some(selectedPatch => selectedPatch.id === patch.id)
      )
    );
  }

  function togglePatchSelectionList(selectedPatches, patch) {
    const index = selectedPatches.findIndex(selectedPatch => selectedPatch.id === patch.id);
    if (index >= 0) {
      return selectedPatches.filter(selectedPatch => selectedPatch.id !== patch.id);
    }

    return [...selectedPatches, patch];
  }

  function toggleVisiblePatchSelection(selectedPatches, visiblePatches) {
    const allVisibleSelected = (
      visiblePatches.length > 0 &&
      visiblePatches.every(patch =>
        selectedPatches.some(selectedPatch => selectedPatch.id === patch.id)
      )
    );

    if (allVisibleSelected) {
      return selectedPatches.filter(selectedPatch =>
        !visiblePatches.some(patch => patch.id === selectedPatch.id)
      );
    }

    const selectedIds = new Set(selectedPatches.map(selectedPatch => selectedPatch.id));
    const nextSelection = selectedPatches.slice();

    visiblePatches.forEach(patch => {
      if (!selectedIds.has(patch.id)) {
        nextSelection.push(patch);
      }
    });

    return nextSelection;
  }

  const elements = createElements(global.document);
  const state = {
    patches: [],
    categories: [],
    selectedCategory: null,
    selectedPatch: null,
    selectedPatches: [],
    midiConnected: false,
    webMidiOutput: null,
    midiRefreshPromise: null,
    lastMidiRefreshSignature: '',
    midiPorts: [],
    selectedMidiPortId: '',
    midiMenuOpen: false,
    midiAccess: null,
    categorySearchTerm: '',
    patchSearchTerm: ''
  };

  const app = global.GenosApp || {};
  app.state = state;
  app.elements = elements;
  app.selectors = {
    buildPatchCollection,
    getVisibleCategories: () => getVisibleCategories(state),
    getVisiblePatches: () => getVisiblePatches(state),
    getSelectedMidiPort: () => getSelectedMidiPort(state),
    areAllVisiblePatchesSelected: () => areAllVisiblePatchesSelected(state),
    togglePatchSelectionList,
    toggleVisiblePatchSelection
  };
  global.GenosApp = app;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      buildPatchCollection,
      getVisibleCategories,
      getVisiblePatches,
      getSelectedMidiPort,
      areAllVisiblePatchesSelected,
      togglePatchSelectionList,
      toggleVisiblePatchSelection
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
