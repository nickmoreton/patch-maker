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
    state.selectedPatchIds = [];

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
    state.selectedPatchIds = app.selection.toggleSelectedPatchIds(patch.id);
    app.view.renderPatches();
    app.view.renderSelectedPatches();
  }

  function removeSelectedPatch(patchId) {
    if (!app.selectors.isPatchSelected(patchId)) {
      return;
    }

    state.selectedPatchIds = app.selection.toggleSelectedPatchIds(patchId);
    app.view.renderPatches();
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

  app.patches = {
    loadDefaultPatches,
    loadPatchData,
    selectCategory,
    togglePatchSelection,
    removeSelectedPatch,
    updateCategorySearchTerm,
    updatePatchSearchTerm
  };
})(window);
