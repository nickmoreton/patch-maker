(function attachRendererPatches(global) {
  const app = global.GenosApp;
  const { elements, state } = app;
  const MAX_SELECTED_PATCHES = 16;

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

  function canSelectMorePatches() {
    return state.selectedPatchIds.length < MAX_SELECTED_PATCHES;
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

    const nextChannel = parseInt(channel, 10);
    if (!Number.isInteger(nextChannel) || nextChannel < 1 || nextChannel > 16) {
      return;
    }

    setSelectedPatchChannel(patchId, nextChannel);
    app.view.renderSelectedPatches();
  }

  function sortSelectedPatchesByChannel() {
    if (state.selectedPatchIds.length < 2) {
      return;
    }

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
    loadPatchData,
    selectCategory,
    togglePatchSelection,
    removeSelectedPatch,
    toggleSelectedPatchExpanded,
    sortSelectedPatchesByChannel,
    updateSelectedPatchChannel,
    updateCategorySearchTerm,
    updatePatchSearchTerm
  };
})(window);
