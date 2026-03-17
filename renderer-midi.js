(function attachRendererMidi(global) {
  const app = global.GenosApp;
  const { elements, state } = app;

  async function refreshMidiDevices() {
    if (state.midiRefreshPromise) {
      return state.midiRefreshPromise;
    }

    const selectedPortId = state.selectedMidiPortId;

    state.midiRefreshPromise = refreshMidiDevicesInternal(selectedPortId);
    try {
      return await state.midiRefreshPromise;
    } finally {
      state.midiRefreshPromise = null;
    }
  }

  async function refreshMidiDevicesInternal(selectedPortId) {
    if (global.electronAPI) {
      try {
        const ports = await global.electronAPI.getMidiOutputs();
        populateMidiDeviceMenu(ports, selectedPortId);
        return;
      } catch (error) {
        console.log('Electron MIDI not available, trying Web MIDI');
      }
    }

    if (global.navigator && global.navigator.requestMIDIAccess) {
      try {
        state.midiAccess = await global.navigator.requestMIDIAccess();
        const ports = [];

        state.midiAccess.outputs.forEach((output, id) => {
          ports.push({ id, name: output.name });
        });

        populateMidiDeviceMenu(ports, selectedPortId);
        return;
      } catch (error) {
        console.error('Web MIDI not available:', error);
      }
    }

    state.midiPorts = [];
    state.lastMidiRefreshSignature = '';
    clearMidiSelection();
    app.view.renderMidiDeviceMenu('MIDI not available');
  }

  async function toggleMidiDeviceMenu() {
    if (state.midiMenuOpen) {
      closeMidiDeviceMenu();
      return;
    }

    await refreshMidiDevices();
    openMidiDeviceMenu();
  }

  function populateMidiDeviceMenu(ports, selectedPortId) {
    const normalizedSelectedPortId = String(selectedPortId || '');
    const nextSignature = JSON.stringify(ports.map(port => ({
      id: String(port.id),
      name: port.name
    })));
    const hasSelectedPort = (
      normalizedSelectedPortId &&
      ports.some(port => String(port.id) === normalizedSelectedPortId)
    );

    state.midiPorts = ports.map(port => ({
      id: String(port.id),
      name: port.name
    }));

    if (nextSignature === state.lastMidiRefreshSignature) {
      if (
        normalizedSelectedPortId &&
        hasSelectedPort &&
        state.selectedMidiPortId !== normalizedSelectedPortId
      ) {
        state.selectedMidiPortId = normalizedSelectedPortId;
      }

      if (normalizedSelectedPortId && !hasSelectedPort) {
        clearMidiSelection();
      }

      app.view.renderMidiDeviceMenu();
      updateMidiDeviceButton();
      return;
    }

    state.lastMidiRefreshSignature = nextSignature;
    app.view.renderMidiDeviceMenu();

    if (!normalizedSelectedPortId) {
      updateMidiDeviceButton();
      return;
    }

    if (hasSelectedPort) {
      state.selectedMidiPortId = normalizedSelectedPortId;
      updateMidiDeviceButton();
      return;
    }

    clearMidiSelection();
  }

  function openMidiDeviceMenu() {
    state.midiMenuOpen = true;
    elements.midiDeviceControl.classList.add('open');
    elements.midiDeviceButton.setAttribute('aria-expanded', 'true');
    elements.midiDeviceMenu.hidden = false;
  }

  function closeMidiDeviceMenu() {
    state.midiMenuOpen = false;
    elements.midiDeviceControl.classList.remove('open');
    elements.midiDeviceButton.setAttribute('aria-expanded', 'false');
    elements.midiDeviceMenu.hidden = true;
  }

  function clearMidiSelection() {
    state.selectedMidiPortId = '';
    state.webMidiOutput = null;
    updateMidiStatus(false);
    updateMidiDeviceButton();
    app.view.renderMidiDeviceMenu();
  }

  async function connectToMidiDevice(portId) {
    const nextPortId = String(portId || state.selectedMidiPortId || '');

    if (!nextPortId) {
      clearMidiSelection();
      closeMidiDeviceMenu();
      return;
    }

    if (global.electronAPI) {
      try {
        const result = await global.electronAPI.connectMidi(parseInt(nextPortId, 10));
        if (result.success) {
          state.selectedMidiPortId = nextPortId;
          state.webMidiOutput = null;
          updateMidiStatus(true);
          closeMidiDeviceMenu();
          return;
        }
      } catch (error) {
        console.log('Electron MIDI connect failed, trying Web MIDI');
      }
    }

    if (state.midiAccess) {
      state.webMidiOutput = state.midiAccess.outputs.get(nextPortId);
      if (state.webMidiOutput) {
        state.selectedMidiPortId = nextPortId;
        updateMidiStatus(true);
        closeMidiDeviceMenu();
        return;
      }
    }

    clearMidiSelection();
    closeMidiDeviceMenu();
  }

  function updateMidiStatus(connected) {
    state.midiConnected = connected;
    updateMidiDeviceButton();
    app.view.renderMidiDeviceMenu();
    app.view.renderDetails();
  }

  function updateMidiDeviceButton() {
    const selectedPort = app.selectors.getSelectedMidiPort();
    if (!elements.midiStatusDot) {
      return;
    }

    elements.midiStatusDot.className = `status-dot ${connectedStateClass()}`;
    elements.midiDeviceName.textContent = selectedPort ? selectedPort.name : 'No MIDI Device';
    elements.midiDeviceStatus.textContent = (
      state.midiConnected && selectedPort ? 'Connected' : 'Not Connected'
    );
  }

  function connectedStateClass() {
    return state.midiConnected ? 'connected' : 'disconnected';
  }

  async function sendPatch(patch) {
    const channel = parseInt(elements.midiChannel.value, 10);

    if (!state.selectedMidiPortId || !state.midiConnected) {
      alert('Please connect to a MIDI device first');
      return;
    }

    if (global.electronAPI) {
      try {
        const result = await global.electronAPI.sendPatch({
          channel,
          msb: patch.msb,
          lsb: patch.lsb,
          pc: patch.pc
        });

        if (result.success) {
          elements.lastSent.textContent = `Sent: ${patch.name}`;
          app.view.flashPatchCard(patch);
          return;
        }
      } catch (error) {
        console.log('Electron send failed, trying Web MIDI');
      }
    }

    if (state.webMidiOutput) {
      const midiChannel = channel - 1;
      state.webMidiOutput.send([0xB0 + midiChannel, 0, patch.msb]);
      state.webMidiOutput.send([0xB0 + midiChannel, 32, patch.lsb]);
      state.webMidiOutput.send([0xC0 + midiChannel, patch.pc]);
      elements.lastSent.textContent = `Sent: ${patch.name}`;
      app.view.flashPatchCard(patch);
    }
  }

  async function exportLogicPreset(patch) {
    if (!global.electronAPI) {
      alert('Export function not available in web mode');
      return;
    }

    try {
      const result = await global.electronAPI.exportPST({
        name: patch.name,
        category: patch.category,
        msb: patch.msb,
        lsb: patch.lsb,
        pc: patch.pc
      });

      if (result.success) {
        const exportBtn = global.document.getElementById('exportBtn');
        if (exportBtn) {
          const originalText = exportBtn.innerHTML;
          exportBtn.innerHTML = '<span class="btn-icon">✓</span>Exported!';
          exportBtn.style.backgroundColor = 'var(--success)';
          setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.style.backgroundColor = '';
          }, 2000);
        }
      } else if (!result.canceled) {
        alert('Error exporting preset: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error exporting preset: ' + error.message);
    }
  }

  async function batchExportPresets(patches) {
    if (!global.electronAPI) {
      alert('Export function not available in web mode');
      return;
    }

    if (patches.length === 0) {
      alert('No patches selected');
      return;
    }

    const result = await global.electronAPI.exportBatchPST(patches.map(patch => ({
      name: patch.name,
      category: patch.category,
      msb: patch.msb,
      lsb: patch.lsb,
      pc: patch.pc
    })));

    if (result.success) {
      const exportBtn = global.document.getElementById('batchExportBtn');
      if (exportBtn) {
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = `<span class="btn-icon">✓</span>Exported ${result.count} files!`;
        exportBtn.style.backgroundColor = 'var(--success)';
        setTimeout(() => {
          exportBtn.innerHTML = originalText;
          exportBtn.style.backgroundColor = '';
        }, 3000);
      }

      setTimeout(() => {
        app.patches.clearMultiSelect();
      }, 3000);
    } else if (!result.canceled) {
      alert('Error exporting presets: ' + (result.error || 'Unknown error'));
    }
  }

  app.midi = {
    refreshMidiDevices,
    toggleMidiDeviceMenu,
    populateMidiDeviceMenu,
    openMidiDeviceMenu,
    closeMidiDeviceMenu,
    clearMidiSelection,
    connectToMidiDevice,
    updateMidiStatus,
    updateMidiDeviceButton,
    connectedStateClass,
    sendPatch,
    exportLogicPreset,
    batchExportPresets
  };
})(window);
