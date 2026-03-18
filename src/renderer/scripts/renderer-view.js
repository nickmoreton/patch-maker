(function attachRendererView(global) {
  const app = global.GenosApp;
  const { elements, state } = app;
  const CHANNEL_OPTIONS = Array.from({ length: 16 }, (_, index) => index + 1);

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

  function renderThemeControl() {
    if (!elements.themeControl) {
      return;
    }

    const buttons = elements.themeControl.querySelectorAll('[data-theme-preference]');
    buttons.forEach(button => {
      const isActive = button.dataset.themePreference === state.themePreference;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
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
      return;
    }

    elements.patchList.innerHTML = visiblePatches.map(patch => {
      const isSelected = app.selectors.isPatchSelected(patch.id);

      return `
        <div class="patch-card ${isSelected ? 'selected' : ''}" data-id="${patch.id}">
          <div class="patch-name">${patch.name}</div>
          <div class="patch-values">
            <span>PC: ${patch.pc}</span>
            <span>LSB: ${patch.lsb}</span>
            <span>MSB: ${patch.msb}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSelectedPatches() {
    app.patches.normalizeSelectedPatchChannels();
    const selectedPatches = app.selectors.getSelectedPatches();

    if (elements.selectedPatchCount) {
      elements.selectedPatchCount.textContent = selectedPatches.length;
    }

    if (elements.selectedPatchSortButton) {
      elements.selectedPatchSortButton.disabled = selectedPatches.length < 2;
    }

    if (selectedPatches.length === 0) {
      elements.detailsContent.innerHTML = `
        <div class="no-selection">
          <span class="no-selection-icon">🎹</span>
          <p>Click patches to build a selected list</p>
        </div>
      `;
      return;
    }

    elements.detailsContent.innerHTML = selectedPatches.map(patch => `
      <article
        class="selected-patch-card ${app.selectors.isSelectedPatchExpanded(patch.id) ? 'expanded' : ''}"
        data-id="${patch.id}"
        aria-expanded="${app.selectors.isSelectedPatchExpanded(patch.id) ? 'true' : 'false'}"
      >
        <div class="selected-patch-top">
          <div class="patch-details selected-patch-summary">
            <div class="detail-category">${patch.category}</div>
            <div class="detail-name">${patch.name}</div>
          </div>
          <div class="selected-patch-actions">
            <span class="selected-patch-toggle" aria-hidden="true">
              ${app.selectors.isSelectedPatchExpanded(patch.id) ? 'Hide settings' : 'Show settings'}
            </span>
            <button
              type="button"
              class="selected-patch-remove"
              data-action="remove-selected"
              data-id="${patch.id}"
              aria-label="Remove ${patch.name} from selected patches"
            >
              Remove
            </button>
          </div>
        </div>

        ${app.selectors.isSelectedPatchExpanded(patch.id) ? `
          <div class="detail-values">
            <div class="detail-row">
              <span class="label">Program</span>
              <span class="value">${patch.pc}</span>
            </div>
            <div class="detail-row">
              <span class="label">Bank LSB</span>
              <span class="value">${patch.lsb}</span>
            </div>
            <div class="detail-row">
              <span class="label">Bank MSB</span>
              <span class="value">${patch.msb}</span>
            </div>
          </div>
        ` : ''}

        <div class="selected-patch-send-row">
          <label class="selected-patch-channel-control" data-prevent-toggle="true">
            <span class="selected-patch-channel-label">MIDI Ch</span>
            <select
              class="selected-patch-channel-select"
              data-channel-select="true"
              data-id="${patch.id}"
              aria-label="MIDI channel for ${patch.name}"
            >
              ${CHANNEL_OPTIONS.map(channel => `
                <option
                  value="${channel}"
                  ${app.selectors.getSelectedPatchChannel(patch.id) === channel ? 'selected' : ''}
                  ${app.selectors.getSelectedPatchAvailableChannels(patch.id).has(channel) ? '' : 'disabled'}
                >
                  ${channel}
                </option>
              `).join('')}
            </select>
          </label>

          <button
            class="btn btn-primary send-btn"
            type="button"
            data-action="send-selected"
            data-id="${patch.id}"
            ${!state.midiConnected ? 'disabled' : ''}
          >
            <span class="btn-icon">🎵</span>
            Send to Genos
          </button>
        </div>
      </article>
    `).join('');
  }

  app.view = {
    renderMidiDeviceMenu,
    renderThemeControl,
    flashPatchCard,
    renderCategories,
    renderPatches,
    renderSelectedPatches
  };
})(window);
