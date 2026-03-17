(function attachRendererView(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

  function renderMidiDeviceMenu(message) {
    const optionsMarkup = [
      `
        <button
          type="button"
          class="midi-device-option${state.selectedMidiPortId === '' ? ' selected' : ''}"
          data-port-id=""
          role="option"
          aria-selected="${state.selectedMidiPortId === '' ? 'true' : 'false'}"
        >
          <span class="status-dot disconnected"></span>
          <span class="midi-device-option-name">No MIDI Device</span>
        </button>
      `
    ];

    if (state.midiPorts.length > 0) {
      optionsMarkup.push(...state.midiPorts.map(port => `
        <button
          type="button"
          class="midi-device-option${state.selectedMidiPortId === port.id ? ' selected' : ''}"
          data-port-id="${port.id}"
          role="option"
          aria-selected="${state.selectedMidiPortId === port.id ? 'true' : 'false'}"
        >
          <span class="status-dot ${state.selectedMidiPortId === port.id && state.midiConnected ? 'connected' : 'disconnected'}"></span>
          <span class="midi-device-option-name">${port.name}</span>
        </button>
      `));
    }

    if (message) {
      optionsMarkup.push(`
        <div class="midi-device-empty" role="status">${message}</div>
      `);
    } else if (state.midiPorts.length === 0) {
      optionsMarkup.push(`
        <div class="midi-device-empty" role="status">No MIDI devices found</div>
      `);
    }

    elements.midiDeviceMenu.innerHTML = optionsMarkup.join('');
  }

  function flashPatchCard(patch) {
    const card = elements.patchList.querySelector(`.patch-card[data-id="${patch.id}"]`);
    if (card) {
      card.style.boxShadow = '0 0 20px var(--accent)';
      setTimeout(() => {
        card.style.boxShadow = '';
      }, 300);
    }
  }

  function renderCategories() {
    const visibleCategories = app.selectors.getVisibleCategories();

    elements.categoryList.innerHTML = `
      <li class="category-item ${state.selectedCategory === null ? 'active' : ''}" data-category="">
        <span>All Patches</span>
        <span class="count">${state.patches.length}</span>
      </li>
      ${visibleCategories.map(category => {
        const count = state.patches.filter(patch => patch.category === category).length;
        return `
          <li class="category-item ${state.selectedCategory === category ? 'active' : ''}" data-category="${category}">
            <span>${category}</span>
            <span class="count">${count}</span>
          </li>
        `;
      }).join('')}
    `;
  }

  function renderPatches() {
    const visiblePatches = app.selectors.getVisiblePatches();

    elements.patchCount.textContent = `${visiblePatches.length} voices`;

    if (visiblePatches.length === 0) {
      elements.patchList.innerHTML = `
        <div class="no-selection" style="grid-column: 1/-1;">
          <span class="no-selection-icon">🔍</span>
          <p>No patches found</p>
        </div>
      `;
      elements.selectAllBtn.style.display = 'none';
      return;
    }

    elements.patchList.innerHTML = visiblePatches.map(patch => {
      const isSelected = state.selectedPatch && state.selectedPatch.id === patch.id;
      const isMultiSelected = state.selectedPatches.some(selectedPatch => selectedPatch.id === patch.id);

      return `
        <div class="patch-card ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''}" data-id="${patch.id}">
          <button class="patch-select-icon ${isMultiSelected ? 'selected' : ''}" data-action="toggle-select" title="Add to selection">
            ${isMultiSelected ? '☑' : '☐'}
          </button>
          <div class="patch-name">${patch.name}</div>
          <div class="patch-values">
            <span>PC: ${patch.pc}</span>
            <span>LSB: ${patch.lsb}</span>
            <span>MSB: ${patch.msb}</span>
          </div>
        </div>
      `;
    }).join('');

    elements.selectAllBtn.style.display = 'flex';
    elements.selectAllBtn.innerHTML = app.selectors.areAllVisiblePatchesSelected()
      ? '<span class="btn-icon">☐</span>Deselect All'
      : '<span class="btn-icon">☑️</span>Select All';
  }

  function renderDetails() {
    if (state.selectedPatches.length > 0) {
      elements.detailsContent.innerHTML = `
        <div class="patch-details">
          <div class="detail-category">Multi-Select Mode</div>
          <div class="detail-name">${state.selectedPatches.length} patches selected</div>

          <div class="multi-select-info">
            <div class="detail-row">
              <span class="label">Selected</span>
              <span class="value">${state.selectedPatches.length}</span>
            </div>
          </div>

          <button class="btn btn-primary" id="batchExportBtn" data-action="batch-export">
            <span class="btn-icon">💾</span>
            Export All as Logic Presets
          </button>

          <button class="btn btn-secondary" id="clearSelectionBtn" data-action="clear-selection" style="margin-top: 8px;">
            <span class="btn-icon">✕</span>
            Clear Selection
          </button>

          <p style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin-top: 12px;">
            Cmd/Ctrl+Click to select/deselect patches
          </p>
        </div>
      `;
      return;
    }

    if (!state.selectedPatch) {
      elements.detailsContent.innerHTML = `
        <div class="no-selection">
          <span class="no-selection-icon">🎹</span>
          <p>Select a patch to view details</p>
          <p style="font-size: 0.85rem; margin-top: 8px; color: var(--text-dim);">
            Cmd/Ctrl+Click for multi-select
          </p>
        </div>
      `;
      return;
    }

    elements.detailsContent.innerHTML = `
      <div class="patch-details">
        <div class="detail-category">${state.selectedPatch.category}</div>
        <div class="detail-name">${state.selectedPatch.name}</div>

        <div class="detail-values">
          <div class="detail-row">
            <span class="label">Program</span>
            <span class="value">${state.selectedPatch.pc}</span>
          </div>
          <div class="detail-row">
            <span class="label">Bank LSB</span>
            <span class="value">${state.selectedPatch.lsb}</span>
          </div>
          <div class="detail-row">
            <span class="label">Bank MSB</span>
            <span class="value">${state.selectedPatch.msb}</span>
          </div>
        </div>

        <button class="btn btn-primary send-btn" id="sendBtn" data-action="send-selected" ${!state.midiConnected ? 'disabled' : ''}>
          <span class="btn-icon">🎵</span>
          Send to Genos
        </button>

        <button class="btn btn-secondary" id="exportBtn" data-action="export-selected" style="margin-top: 8px;">
          <span class="btn-icon">💾</span>
          Export Logic Preset
        </button>

        <p style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin-top: 8px;">
          Double-click any patch to send quickly
        </p>
      </div>
    `;
  }

  app.view = {
    renderMidiDeviceMenu,
    flashPatchCard,
    renderCategories,
    renderPatches,
    renderDetails
  };
})(window);
