(function bootstrapRenderer(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

  async function init() {
    setupEventListeners();
    await app.patches.loadDefaultPatches();
    await app.midi.refreshMidiDevices();
  }

  function setupEventListeners() {
    elements.midiDeviceButton.addEventListener('click', app.midi.toggleMidiDeviceMenu);
    elements.midiDeviceButton.addEventListener('keydown', handleMidiDeviceButtonKeydown);
    elements.midiDeviceMenu.addEventListener('click', handleMidiDeviceOptionClick);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    elements.categorySearch.addEventListener('input', handleCategorySearchInput);
    elements.patchSearch.addEventListener('input', handlePatchSearchInput);
    elements.categoryList.addEventListener('click', handleCategoryListClick);
    elements.patchList.addEventListener('click', handlePatchListClick);
    elements.patchList.addEventListener('dblclick', handlePatchListDoubleClick);
    elements.detailsContent.addEventListener('click', handleDetailsContentClick);
  }

  function handleMidiDeviceButtonKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      app.midi.toggleMidiDeviceMenu();
    }
  }

  function handleMidiDeviceOptionClick(event) {
    const option = event.target.closest('[data-port-id]');
    if (!option) {
      return;
    }

    app.midi.connectToMidiDevice(option.dataset.portId);
  }

  function handleDocumentClick(event) {
    if (!state.midiMenuOpen || elements.midiDeviceControl.contains(event.target)) {
      return;
    }

    app.midi.closeMidiDeviceMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && state.midiMenuOpen) {
      app.midi.closeMidiDeviceMenu();
      elements.midiDeviceButton.focus();
    }
  }

  function handleCategorySearchInput(event) {
    app.patches.updateCategorySearchTerm(event.target.value);
  }

  function handlePatchSearchInput(event) {
    app.patches.updatePatchSearchTerm(event.target.value);
  }

  function handleCategoryListClick(event) {
    const item = event.target.closest('[data-category]');
    if (!item) {
      return;
    }

    const category = item.dataset.category || null;
    app.patches.selectCategory(category);
  }

  function getPatchFromEventTarget(target) {
    const card = target.closest('.patch-card[data-id]');
    if (!card) {
      return null;
    }

    const patchId = parseInt(card.dataset.id, 10);
    return state.patches.find(patch => patch.id === patchId) || null;
  }

  function handlePatchListClick(event) {
    const patch = getPatchFromEventTarget(event.target);
    if (!patch) {
      return;
    }

    app.patches.selectPatch(patch);
  }

  function handlePatchListDoubleClick(event) {
    const patch = getPatchFromEventTarget(event.target);
    if (!patch) {
      return;
    }

    app.midi.sendPatch(patch);
  }

  function handleDetailsContentClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      return;
    }

    switch (actionTarget.dataset.action) {
      case 'send-selected':
        if (state.selectedPatch) {
          app.midi.sendPatch(state.selectedPatch);
        }
        break;
      default:
        break;
    }
  }

  app.init = init;
  init();
})(window);
