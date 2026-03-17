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
      categorySearch: doc.getElementById('categorySearch'),
      categoryList: doc.getElementById('categoryList'),
      categoryCount: doc.getElementById('categoryCount'),
      currentCategory: doc.getElementById('currentCategory'),
      patchCount: doc.getElementById('patchCount'),
      patchSearch: doc.getElementById('patchSearch'),
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

  const elements = createElements(global.document);
  const state = {
    patches: [],
    categories: [],
    selectedCategory: null,
    selectedPatch: null,
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
    getSelectedMidiPort: () => getSelectedMidiPort(state)
  };
  global.GenosApp = app;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      buildPatchCollection,
      getVisibleCategories,
      getVisiblePatches,
      getSelectedMidiPort
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
