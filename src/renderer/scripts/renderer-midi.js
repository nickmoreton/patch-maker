const BULK_SEND_DELAY_MS = 50;

function wait(durationMs) {
  return new Promise(resolve => {
    setTimeout(resolve, durationMs);
  });
}

async function sendPatchesSequentially({
  patches,
  sendPatch,
  onProgress,
  onSuccess,
  waitFor = wait,
  delayMs = BULK_SEND_DELAY_MS
}) {
  const queue = Array.isArray(patches) ? patches : [];

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];

    if (onProgress) {
      onProgress(entry, index, queue.length);
    }

    const result = await sendPatch(entry, index, queue.length);
    if (!result || result.success !== true) {
      return {
        success: false,
        error: result && result.error ? result.error : 'Unable to send patch',
        failedEntry: entry,
        failedIndex: index,
        total: queue.length
      };
    }

    if (onSuccess) {
      onSuccess(entry, index, queue.length);
    }

    if (delayMs > 0 && index < queue.length - 1) {
      await waitFor(delayMs);
    }
  }

  return {
    success: true,
    total: queue.length
  };
}

(function attachRendererMidi(global) {
  const app = global.GenosApp;
  if (!app) {
    return;
  }

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
    const nextPortId = (
      portId === undefined
        ? String(state.selectedMidiPortId || '')
        : String(portId || '')
    );

    if (!nextPortId) {
      if (global.electronAPI && global.electronAPI.disconnectMidi) {
        try {
          await global.electronAPI.disconnectMidi();
        } catch (error) {
          console.log('Electron MIDI disconnect failed');
        }
      }

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
    app.view.renderSelectedPatches();
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

  function createPatchPayload(patch, channel) {
    return {
      channel,
      msb: patch.msb,
      lsb: patch.lsb,
      pc: patch.pc
    };
  }

  function updateLastSentStatus(message) {
    if (!elements.lastSent) {
      return;
    }

    elements.lastSent.textContent = message;
  }

  function getConnectionFailureResult() {
    return {
      success: false,
      error: 'Please connect to a MIDI device first',
      requiresConnection: true
    };
  }

  async function transmitPatchPayload(payload) {
    if (!state.selectedMidiPortId || !state.midiConnected) {
      return getConnectionFailureResult();
    }

    let electronSendError = '';

    if (global.electronAPI) {
      try {
        const result = await global.electronAPI.sendPatch(payload);
        if (result.success) {
          return result;
        }

        electronSendError = result && result.error ? result.error : '';
      } catch (error) {
        console.log('Electron send failed, trying Web MIDI');
        electronSendError = error && error.message ? error.message : '';
      }
    }

    if (state.webMidiOutput) {
      try {
        const midiChannel = payload.channel - 1;
        state.webMidiOutput.send([0xB0 + midiChannel, 0, payload.msb]);
        state.webMidiOutput.send([0xB0 + midiChannel, 32, payload.lsb]);
        state.webMidiOutput.send([0xC0 + midiChannel, payload.pc]);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error && error.message ? error.message : 'Unable to send patch'
        };
      }
    }

    return {
      success: false,
      error: electronSendError || 'No MIDI output available'
    };
  }

  async function sendPatch(patch) {
    const channel = app.selectors.getSelectedPatchChannel(patch.id) || 1;
    const result = await transmitPatchPayload(createPatchPayload(patch, channel));

    if (!result.success) {
      updateLastSentStatus(result.error);
      if (result.requiresConnection) {
        alert(result.error);
      }
      return result;
    }

    updateLastSentStatus(`Sent: ${patch.name}`);
    app.view.flashPatchCard(patch);
    return result;
  }

  async function sendSelectedPatches() {
    if (state.bulkSendInProgress) {
      return { success: false, error: 'Bulk send already in progress' };
    }

    const selectedPatches = app.selectors.getSelectedPatches();
    if (selectedPatches.length === 0) {
      return { success: false, error: 'No patches selected' };
    }

    if (!state.selectedMidiPortId || !state.midiConnected) {
      const result = getConnectionFailureResult();
      updateLastSentStatus(result.error);
      alert(result.error);
      return result;
    }

    const patchQueue = selectedPatches.map(patch => ({
      patch,
      channel: app.selectors.getSelectedPatchChannel(patch.id) || 1
    }));

    state.bulkSendInProgress = true;
    app.view.renderSelectedPatches();

    try {
      const result = await sendPatchesSequentially({
        patches: patchQueue,
        delayMs: BULK_SEND_DELAY_MS,
        onProgress(entry, index, total) {
          updateLastSentStatus(`Sending ${index + 1}/${total}: ${entry.patch.name}`);
        },
        onSuccess(entry) {
          app.view.flashPatchCard(entry.patch);
        },
        sendPatch(entry) {
          return transmitPatchPayload(createPatchPayload(entry.patch, entry.channel));
        }
      });

      if (!result.success) {
        const failedPatchName = result.failedEntry && result.failedEntry.patch
          ? result.failedEntry.patch.name
          : 'patch';
        updateLastSentStatus(`Failed sending ${failedPatchName}: ${result.error}`);
        return result;
      }

      updateLastSentStatus(`Sent ${result.total} patches`);
      return result;
    } finally {
      state.bulkSendInProgress = false;
      app.view.renderSelectedPatches();
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
    sendSelectedPatches
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BULK_SEND_DELAY_MS,
    wait,
    sendPatchesSequentially
  };
}
