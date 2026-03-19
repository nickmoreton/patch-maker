(function bootstrapRenderer(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

  async function init() {
    app.theme.init();
    setupEventListeners();
    await app.patches.loadDefaultPatches();
    await app.patches.loadFavouriteLists();
    await app.midi.refreshMidiDevices();
  }

  function setupEventListeners() {
    elements.themeControl.addEventListener('click', handleThemeControlClick);
    elements.headerLoadFavouriteButton.addEventListener('click', handleHeaderLoadFavouriteClick);
    elements.midiDeviceButton.addEventListener('click', app.midi.toggleMidiDeviceMenu);
    elements.midiDeviceButton.addEventListener('keydown', handleMidiDeviceButtonKeydown);
    elements.midiDeviceMenu.addEventListener('click', handleMidiDeviceOptionClick);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    elements.categorySearch.addEventListener('input', handleCategorySearchInput);
    elements.categorySearchClear.addEventListener('click', handleCategorySearchClearClick);
    elements.patchSearch.addEventListener('input', handlePatchSearchInput);
    elements.patchSearchClear.addEventListener('click', handlePatchSearchClearClick);
    elements.categoryList.addEventListener('click', handleCategoryListClick);
    elements.patchList.addEventListener('click', handlePatchListClick);
    elements.selectedPatchSaveFavouriteButton.addEventListener('click', handleSelectedPatchSaveFavouriteClick);
    elements.selectedPatchSortButton.addEventListener('click', handleSelectedPatchSortClick);
    elements.selectedPatchSendAllButton.addEventListener('click', handleSelectedPatchSendAllClick);
    elements.detailsContent.addEventListener('click', handleDetailsContentClick);
    elements.detailsContent.addEventListener('change', handleDetailsContentChange);
    elements.appModalBackdrop.addEventListener('click', handleModalBackdropClick);
    elements.appModal.addEventListener('click', handleAppModalClick);
    elements.appModalForm.addEventListener('submit', handleModalSubmit);
    elements.appModalCancelButton.addEventListener('click', handleModalCancelClick);
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

  function handleHeaderLoadFavouriteClick() {
    app.patches.openBrowseFavouritesModal();
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
    if (state.modal.isOpen && event.key === 'Escape') {
      app.patches.closeModal();
      return;
    }

    if (event.key === 'Escape' && state.midiMenuOpen) {
      app.midi.closeMidiDeviceMenu();
      elements.midiDeviceButton.focus();
    }
  }

  function handleCategorySearchInput(event) {
    app.patches.updateCategorySearchTerm(event.target.value);
  }

  function handleCategorySearchClearClick() {
    elements.categorySearch.value = '';
    app.patches.updateCategorySearchTerm('');
    elements.categorySearch.focus();
  }

  function handlePatchSearchInput(event) {
    app.patches.updatePatchSearchTerm(event.target.value);
  }

  function handlePatchSearchClearClick() {
    elements.patchSearch.value = '';
    app.patches.updatePatchSearchTerm('');
    elements.patchSearch.focus();
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

  function handleSelectedPatchSortClick() {
    if (state.bulkSendInProgress) {
      return;
    }

    app.patches.sortSelectedPatchesByChannel();
  }

  function handleSelectedPatchSaveFavouriteClick() {
    app.patches.saveSelectedPatchesAsFavourite();
  }

  function handleSelectedPatchSendAllClick() {
    if (state.bulkSendInProgress) {
      return;
    }

    app.midi.sendSelectedPatches();
  }

  function handleDetailsContentClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget) {
      const patchId = parseInt(actionTarget.dataset.id, 10);
      const patch = state.patches.find(candidate => candidate.id === patchId) || null;

      switch (actionTarget.dataset.action) {
        case 'send-selected':
          if (patch && !state.bulkSendInProgress) {
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

    if (event.target.closest('[data-prevent-toggle="true"]')) {
      return;
    }

    const patchCard = event.target.closest('.selected-patch-card[data-id]');
    if (!patchCard) {
      return;
    }

    const patchId = parseInt(patchCard.dataset.id, 10);
    app.patches.toggleSelectedPatchExpanded(patchId);
  }

  function handleDetailsContentChange(event) {
    const channelSelect = event.target.closest('[data-channel-select="true"]');
    if (!channelSelect) {
      return;
    }

    const patchId = parseInt(channelSelect.dataset.id, 10);
    app.patches.updateSelectedPatchChannel(patchId, channelSelect.value);
  }

  function handleModalBackdropClick(event) {
    if (event.target !== elements.appModalBackdrop) {
      return;
    }

    app.patches.closeModal();
  }

  function handleAppModalClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      return;
    }

    switch (actionTarget.dataset.action) {
      case 'load-favourite':
        app.patches.loadFavouriteList(actionTarget.dataset.favouriteName);
        return;
      case 'delete-favourite':
        app.patches.deleteFavouriteList(actionTarget.dataset.favouriteName);
        return;
      default:
        return;
    }
  }

  function handleModalSubmit(event) {
    event.preventDefault();
    app.patches.submitModal();
  }

  function handleModalCancelClick() {
    app.patches.closeModal();
  }

  app.init = init;
  init();
})(window);
