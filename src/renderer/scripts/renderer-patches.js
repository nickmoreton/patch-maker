(function attachRendererPatches(global) {
  const app = global.GenosApp;
  const { elements, state } = app;
  const MAX_SELECTED_PATCHES = 16;

  function setStatusMessage(message) {
    if (elements.lastSent) {
      elements.lastSent.textContent = message;
    }
  }

  function clearSelectionState() {
    state.selectedPatchIds = [];
    state.expandedSelectedPatchIds = [];
    state.selectedPatchChannelsById = {};
  }

  function setSelectedPatchChannel(patchId, channel) {
    state.selectedPatchChannelsById[String(patchId)] = channel;
  }

  function clearSelectedPatchChannel(patchId) {
    delete state.selectedPatchChannelsById[String(patchId)];
  }

  function setSavedFavouriteLists(lists) {
    state.savedFavouriteLists = app.selectors.sortFavouriteLists(Array.isArray(lists) ? lists : []);
  }

  function focusModalInput() {
    if (!elements.appModalInput) {
      return;
    }

    global.requestAnimationFrame(() => {
      elements.appModalInput.focus();
      elements.appModalInput.select();
    });
  }

  function openModal(nextModal) {
    state.modal = {
      ...state.modal,
      isOpen: true,
      mode: nextModal.mode || null,
      title: nextModal.title || '',
      message: nextModal.message || '',
      confirmLabel: nextModal.confirmLabel || 'Confirm',
      cancelLabel: nextModal.cancelLabel || 'Cancel',
      inputLabel: nextModal.inputLabel || 'Favourite name',
      inputValue: nextModal.inputValue || '',
      error: nextModal.error || '',
      showInput: Boolean(nextModal.showInput),
      targetName: nextModal.targetName || ''
    };
    app.view.renderAppModal();

    if (state.modal.showInput) {
      focusModalInput();
    } else if (elements.appModalConfirmButton) {
      global.requestAnimationFrame(() => {
        elements.appModalConfirmButton.focus();
      });
    }
  }

  function closeModal() {
    state.modal = {
      ...state.modal,
      isOpen: false,
      mode: null,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      inputValue: '',
      error: '',
      showInput: false,
      targetName: ''
    };
    app.view.renderAppModal();
  }

  function openSaveFavouriteModal(initialValue = '', error = '') {
    openModal({
      mode: 'save-favourite',
      title: 'Save Favourite',
      message: 'Enter a name for this selected patch list.',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      inputLabel: 'Favourite name',
      inputValue: initialValue,
      error,
      showInput: true
    });
  }

  function openOverwriteFavouriteModal(name) {
    openModal({
      mode: 'confirm-overwrite-favourite',
      title: 'Replace Favourite?',
      message: `"${name}" already exists. Replace it with the current selected patches?`,
      confirmLabel: 'Replace',
      cancelLabel: 'Cancel',
      showInput: false,
      targetName: name
    });
  }

  function openDeleteFavouriteModal(name) {
    openModal({
      mode: 'confirm-delete-favourite',
      title: 'Delete Favourite?',
      message: `Delete the saved favourite "${name}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      showInput: false,
      targetName: name
    });
  }

  function findNextFreeMidiChannel(usedChannels) {
    for (let channel = 1; channel <= 16; channel += 1) {
      if (!usedChannels.has(channel)) {
        return channel;
      }
    }

    return null;
  }

  function normalizeSelectedPatchChannels() {
    const usedChannels = new Set();

    state.selectedPatchIds.forEach(patchId => {
      const currentChannel = state.selectedPatchChannelsById[String(patchId)];

      if (
        Number.isInteger(currentChannel) &&
        currentChannel >= 1 &&
        currentChannel <= 16 &&
        !usedChannels.has(currentChannel)
      ) {
        usedChannels.add(currentChannel);
        return;
      }

      const nextChannel = findNextFreeMidiChannel(usedChannels);
      if (nextChannel !== null) {
        setSelectedPatchChannel(patchId, nextChannel);
        usedChannels.add(nextChannel);
      }
    });
  }

  function canSelectMorePatches() {
    return state.selectedPatchIds.length < MAX_SELECTED_PATCHES;
  }

  function formatPatchCount(count) {
    return `${count} patch${count === 1 ? '' : 'es'}`;
  }

  function formatMissingPatchCount(count) {
    return `${count} missing patch${count === 1 ? '' : 'es'}`;
  }

  function buildFavouritePatchSnapshot(patch) {
    return {
      category: patch.category,
      name: patch.name,
      msb: patch.msb,
      lsb: patch.lsb,
      pc: patch.pc,
      channel: app.selectors.getSelectedPatchChannel(patch.id)
    };
  }

  async function loadFavouriteLists() {
    if (!global.electronAPI || typeof global.electronAPI.getFavouriteLists !== 'function') {
      setSavedFavouriteLists([]);
      app.view.renderSelectedPatches();
      return;
    }

    const result = await global.electronAPI.getFavouriteLists();
    if (!result || result.success === false) {
      setStatusMessage(result && result.error ? result.error : 'Unable to load favourite lists');
      return;
    }

    setSavedFavouriteLists(result.lists);
    app.view.renderSelectedPatches();
  }

  async function saveSelectedPatchesAsFavourite() {
    const selectedPatches = app.selectors.getSelectedPatches();
    if (selectedPatches.length === 0) {
      return;
    }

    openSaveFavouriteModal();
  }

  async function persistFavouriteList(name) {
    if (!global.electronAPI || typeof global.electronAPI.saveFavouriteList !== 'function') {
      setStatusMessage('Favourite saving is unavailable in this build.');
      return;
    }

    const selectedPatches = app.selectors.getSelectedPatches();
    const result = await global.electronAPI.saveFavouriteList({
      name,
      patches: selectedPatches.map(buildFavouritePatchSnapshot)
    });

    if (!result || result.success === false) {
      setStatusMessage(result && result.error ? result.error : 'Unable to save favourite list');
      return;
    }

    setSavedFavouriteLists(result.lists);
    app.view.renderSelectedPatches();
    setStatusMessage(`Saved favourite: ${name}`);
  }

  function getRestoredMidiChannel(savedChannel, usedChannels) {
    const requestedChannel = parseInt(savedChannel, 10);
    if (
      Number.isInteger(requestedChannel) &&
      requestedChannel >= 1 &&
      requestedChannel <= 16 &&
      !usedChannels.has(requestedChannel)
    ) {
      return requestedChannel;
    }

    return findNextFreeMidiChannel(usedChannels);
  }

  function loadFavouriteList(name) {
    const favourite = state.savedFavouriteLists.find(entry => entry.name === name);
    if (!favourite) {
      setStatusMessage(`Favourite not found: ${name}`);
      return;
    }

    const patchesByIdentity = new Map(
      state.patches.map(patch => [app.selectors.buildPatchIdentity(patch), patch])
    );
    const usedChannels = new Set();
    let loadedCount = 0;
    let missingCount = 0;

    clearSelectionState();

    favourite.patches.forEach(savedPatch => {
      if (state.selectedPatchIds.length >= MAX_SELECTED_PATCHES) {
        return;
      }

      const patch = patchesByIdentity.get(app.selectors.buildPatchIdentity(savedPatch));
      if (!patch || state.selectedPatchIds.includes(patch.id)) {
        if (!patch) {
          missingCount += 1;
        }
        return;
      }

      state.selectedPatchIds.push(patch.id);
      const channel = getRestoredMidiChannel(savedPatch.channel, usedChannels);
      if (channel !== null) {
        setSelectedPatchChannel(patch.id, channel);
        usedChannels.add(channel);
      }
      loadedCount += 1;
    });

    app.view.renderPatches();
    app.view.renderSelectedPatches();

    if (loadedCount === 0) {
      setStatusMessage(`No patches from ${name} were found in the current library.`);
      return;
    }

    if (missingCount > 0) {
      setStatusMessage(`Loaded ${formatPatchCount(loadedCount)} from ${name}, skipped ${formatMissingPatchCount(missingCount)}.`);
      return;
    }

    setStatusMessage(`Loaded favourite: ${name}`);
  }

  async function performDeleteFavouriteList(name) {
    if (!global.electronAPI || typeof global.electronAPI.deleteFavouriteList !== 'function') {
      setStatusMessage('Favourite deletion is unavailable in this build.');
      return;
    }

    const result = await global.electronAPI.deleteFavouriteList(name);
    if (!result || result.success === false) {
      setStatusMessage(result && result.error ? result.error : 'Unable to delete favourite list');
      return;
    }

    setSavedFavouriteLists(result.lists);
    app.view.renderSelectedPatches();
    setStatusMessage(`Deleted favourite: ${name}`);
  }

  async function submitModal() {
    if (!state.modal.isOpen) {
      return;
    }

    switch (state.modal.mode) {
      case 'save-favourite': {
        const name = String(elements.appModalInput && elements.appModalInput.value || '').trim();
        if (!name) {
          openSaveFavouriteModal('', 'Favourite name cannot be blank.');
          return;
        }

        const existingFavourite = state.savedFavouriteLists.find(list => list.name === name);
        if (existingFavourite) {
          openOverwriteFavouriteModal(name);
          return;
        }

        closeModal();
        await persistFavouriteList(name);
        return;
      }
      case 'confirm-overwrite-favourite': {
        const name = state.modal.targetName;
        closeModal();
        await persistFavouriteList(name);
        return;
      }
      case 'confirm-delete-favourite': {
        const name = state.modal.targetName;
        closeModal();
        await performDeleteFavouriteList(name);
        return;
      }
      default:
        closeModal();
    }
  }

  function requestDeleteFavouriteList(name) {
    openDeleteFavouriteModal(name);
  }

  async function loadDefaultPatches() {
    if (global.electronAPI) {
      const data = await global.electronAPI.getDefaultPatches();
      if (data && !data.error) {
        loadPatchData(data);
        return;
      }
    }

    elements.patchesLoaded.textContent = 'No bundled patches available';
    elements.patchList.innerHTML = `
      <div class="loading" style="grid-column: 1/-1; flex-direction: column;">
        <p>No bundled patches loaded</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">Expected to find a valid patches.json file in the app bundle.</p>
      </div>
    `;
  }

  function loadPatchData(data) {
    const patchCollection = app.selectors.buildPatchCollection(data);

    state.patches = patchCollection.patches;
    state.categories = patchCollection.categories;
    clearSelectionState();

    app.view.renderCategories();
    app.view.renderPatches();
    app.view.renderSelectedPatches();

    elements.patchesLoaded.textContent = `${state.patches.length} patches loaded`;
    elements.categoryCount.textContent = state.categories.length;
  }

  function selectCategory(category) {
    state.selectedCategory = category;
    elements.currentCategory.textContent = category || 'All Patches';
    app.view.renderCategories();
    app.view.renderPatches();
  }

  function togglePatchSelection(patch) {
    const isRemoving = app.selectors.isPatchSelected(patch.id);

    if (isRemoving) {
      state.selectedPatchIds = app.selection.toggleSelectedPatchIds(patch.id);
      state.expandedSelectedPatchIds = app.selection.collapseRemovedSelectedPatch(patch.id);
      clearSelectedPatchChannel(patch.id);
      app.view.renderPatches();
      app.view.renderSelectedPatches();
      return;
    }

    if (!canSelectMorePatches()) {
      elements.lastSent.textContent = 'Selection limit reached: remove a selected patch before adding another.';
      alert('You can select up to 16 patches at once. Remove a selected patch before adding another.');
      return;
    }

    const channel = app.selectors.getNextAvailableMidiChannel();
    if (channel === null) {
      elements.lastSent.textContent = 'No free MIDI channels are available for a new selected patch.';
      alert('All 16 MIDI channels are already assigned. Remove a selected patch or change an existing channel before adding another.');
      return;
    }

    state.selectedPatchIds = app.selection.toggleSelectedPatchIds(patch.id);
    setSelectedPatchChannel(patch.id, channel);
    app.view.renderPatches();
    app.view.renderSelectedPatches();
  }

  function removeSelectedPatch(patchId) {
    if (!app.selectors.isPatchSelected(patchId)) {
      return;
    }

    state.selectedPatchIds = app.selection.toggleSelectedPatchIds(patchId);
    state.expandedSelectedPatchIds = app.selection.collapseRemovedSelectedPatch(patchId);
    clearSelectedPatchChannel(patchId);
    app.view.renderPatches();
    app.view.renderSelectedPatches();
  }

  function toggleSelectedPatchExpanded(patchId) {
    if (!app.selectors.isPatchSelected(patchId)) {
      return;
    }

    state.expandedSelectedPatchIds = app.selection.toggleSelectedPatchExpanded(patchId);
    app.view.renderSelectedPatches();
  }

  function updateCategorySearchTerm(value) {
    state.categorySearchTerm = String(value || '');
    app.view.renderCategories();
  }

  function updatePatchSearchTerm(value) {
    state.patchSearchTerm = String(value || '');
    app.view.renderPatches();
  }

  function updateSelectedPatchChannel(patchId, channel) {
    if (!app.selectors.isPatchSelected(patchId)) {
      return;
    }

    normalizeSelectedPatchChannels();

    const nextChannel = parseInt(channel, 10);
    if (!Number.isInteger(nextChannel) || nextChannel < 1 || nextChannel > 16) {
      app.view.renderSelectedPatches();
      return;
    }

    const usedChannels = app.selectors.getUsedMidiChannels(patchId);
    if (usedChannels.has(nextChannel)) {
      app.view.renderSelectedPatches();
      return;
    }

    setSelectedPatchChannel(patchId, nextChannel);
    app.view.renderSelectedPatches();
  }

  function sortSelectedPatchesByChannel() {
    if (state.selectedPatchIds.length < 2) {
      return;
    }

    normalizeSelectedPatchChannels();

    state.selectedPatchIds = state.selectedPatchIds
      .map((patchId, index) => ({
        patchId,
        index,
        channel: state.selectedPatchChannelsById[String(patchId)] || Number.MAX_SAFE_INTEGER
      }))
      .sort((left, right) => left.channel - right.channel || left.index - right.index)
      .map(entry => entry.patchId);

    app.view.renderSelectedPatches();
  }

  app.patches = {
    loadDefaultPatches,
    loadFavouriteLists,
    loadPatchData,
    selectCategory,
    togglePatchSelection,
    removeSelectedPatch,
    toggleSelectedPatchExpanded,
    sortSelectedPatchesByChannel,
    normalizeSelectedPatchChannels,
    updateSelectedPatchChannel,
    updateCategorySearchTerm,
    updatePatchSearchTerm,
    saveSelectedPatchesAsFavourite,
    loadFavouriteList,
    deleteFavouriteList: requestDeleteFavouriteList,
    submitModal,
    closeModal
  };
})(window);
