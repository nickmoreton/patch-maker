(function attachRendererPatches(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

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

    app.view.renderCategories();
    app.view.renderPatches();

    elements.patchesLoaded.textContent = `${state.patches.length} patches loaded`;
    elements.categoryCount.textContent = state.categories.length;
  }

  function selectCategory(category) {
    state.selectedCategory = category;
    elements.currentCategory.textContent = category || 'All Patches';
    app.view.renderCategories();
    app.view.renderPatches();
  }

  function selectPatch(patch) {
    state.selectedPatch = patch;
    state.selectedPatches = [];
    app.view.renderPatches();
    app.view.renderDetails();
  }

  function togglePatchSelection(patch) {
    state.selectedPatches = app.selectors.togglePatchSelectionList(state.selectedPatches, patch);
    state.selectedPatch = null;
    app.view.renderPatches();
    app.view.renderDetails();
  }

  function clearMultiSelect() {
    state.selectedPatches = [];
    app.view.renderPatches();
    app.view.renderDetails();
  }

  function selectAllVisiblePatches() {
    const visiblePatches = app.selectors.getVisiblePatches();
    state.selectedPatches = app.selectors.toggleVisiblePatchSelection(
      state.selectedPatches,
      visiblePatches
    );
    state.selectedPatch = null;
    app.view.renderPatches();
    app.view.renderDetails();
  }

  function updateCategorySearchTerm(value) {
    state.categorySearchTerm = String(value || '');
    app.view.renderCategories();
  }

  function updatePatchSearchTerm(value) {
    state.patchSearchTerm = String(value || '');
    app.view.renderPatches();
  }

  app.patches = {
    loadDefaultPatches,
    loadPatchData,
    selectCategory,
    selectPatch,
    togglePatchSelection,
    clearMultiSelect,
    selectAllVisiblePatches,
    updateCategorySearchTerm,
    updatePatchSearchTerm
  };
})(window);
