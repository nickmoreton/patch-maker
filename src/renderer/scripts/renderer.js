(function bootstrapRenderer(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

  async function init() {
    app.theme.init();
    setupEventListeners();
    await app.patches.loadDefaultPatches();
    await app.midi.refreshMidiDevices();
  }

  function setupEventListeners() {
    elements.themeControl.addEventListener('click', handleThemeControlClick);
    elements.midiDeviceButton.addEventListener('click', app.midi.toggleMidiDeviceMenu);
    elements.midiDeviceButton.addEventListener('keydown', handleMidiDeviceButtonKeydown);
    elements.midiDeviceMenu.addEventListener('click', handleMidiDeviceOptionClick);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    elements.categorySearch.addEventListener('input', handleCategorySearchInput);
    elements.patchSearch.addEventListener('input', handlePatchSearchInput);
    elements.categoryList.addEventListener('click', handleCategoryListClick);
    elements.patchList.addEventListener('click', handlePatchListClick);
    elements.detailsContent.addEventListener('click', handleDetailsContentClick);
  }

  function handleThemeControlClick(event) {
    const option = event.target.closest('[data-theme-preference]');
    if (!option) {
      return;
    }

    app.theme.syncTheme(option.dataset.themePreference);
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

    app.patches.togglePatchSelection(patch);
  }

  function handleDetailsContentClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget) {
      const patchId = parseInt(actionTarget.dataset.id, 10);
      const patch = state.patches.find(candidate => candidate.id === patchId) || null;

      switch (actionTarget.dataset.action) {
        case 'send-selected':
          if (patch) {
            app.midi.sendPatch(patch);
          }
          return;
        case 'remove-selected':
          if (patch) {
            app.patches.removeSelectedPatch(patch.id);
          }
          return;
        default:
          return;
      }
    }

    const patchCard = event.target.closest('.selected-patch-card[data-id]');
    if (!patchCard) {
      return;
    }

    const patchId = parseInt(patchCard.dataset.id, 10);
    app.patches.toggleSelectedPatchExpanded(patchId);
  }

  app.init = init;
  init();
})(window);
