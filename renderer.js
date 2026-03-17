// State
let patches = [];
let categories = [];
let selectedCategory = null;
let selectedPatch = null;
let selectedPatches = []; // Multi-select array
let midiConnected = false;
let webMidiOutput = null;
let midiRefreshPromise = null;
let lastMidiRefreshSignature = '';
let midiPorts = [];
let selectedMidiPortId = '';
let midiMenuOpen = false;

// DOM Elements
const elements = {
  midiDeviceControl: document.getElementById('midiDeviceControl'),
  midiDeviceButton: document.getElementById('midiDeviceButton'),
  midiDeviceMenu: document.getElementById('midiDeviceMenu'),
  midiStatusDot: document.getElementById('midiStatusDot'),
  midiDeviceName: document.getElementById('midiDeviceName'),
  midiDeviceStatus: document.getElementById('midiDeviceStatus'),
  midiChannel: document.getElementById('midiChannel'),
  categorySearch: document.getElementById('categorySearch'),
  categoryList: document.getElementById('categoryList'),
  categoryCount: document.getElementById('categoryCount'),
  currentCategory: document.getElementById('currentCategory'),
  patchCount: document.getElementById('patchCount'),
  patchSearch: document.getElementById('patchSearch'),
  patchList: document.getElementById('patchList'),
  detailsContent: document.getElementById('detailsContent'),
  patchesLoaded: document.getElementById('patchesLoaded'),
  lastSent: document.getElementById('lastSent'),
  selectAllBtn: document.getElementById('selectAllBtn')
};

// Initialize
async function init() {
  setupEventListeners();
  await loadDefaultPatches();
  await refreshMidiDevices();
}

function setupEventListeners() {
  elements.midiDeviceButton.addEventListener('click', toggleMidiDeviceMenu);
  elements.midiDeviceButton.addEventListener('keydown', handleMidiDeviceButtonKeydown);
  elements.midiDeviceMenu.addEventListener('click', handleMidiDeviceOptionClick);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
  elements.categorySearch.addEventListener('input', filterCategories);
  elements.patchSearch.addEventListener('input', filterPatches);
  elements.selectAllBtn.addEventListener('click', selectAllVisiblePatches);
}

// MIDI Functions
async function refreshMidiDevices() {
  if (midiRefreshPromise) {
    return midiRefreshPromise;
  }

  const selectedPortId = selectedMidiPortId;

  midiRefreshPromise = refreshMidiDevicesInternal(selectedPortId);
  try {
    return await midiRefreshPromise;
  } finally {
    midiRefreshPromise = null;
  }
}

async function refreshMidiDevicesInternal(selectedPortId) {
  // Try Electron API first
  if (window.electronAPI) {
    try {
      const ports = await window.electronAPI.getMidiOutputs();
      populateMidiDeviceMenu(ports, selectedPortId);
      return;
    } catch (e) {
      console.log('Electron MIDI not available, trying Web MIDI');
    }
  }
  
  // Fall back to Web MIDI API
  if (navigator.requestMIDIAccess) {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const ports = [];
      midiAccess.outputs.forEach((output, id) => {
        ports.push({ id, name: output.name });
      });
      populateMidiDeviceMenu(ports, selectedPortId);
      
      // Store for later use
      window.midiAccess = midiAccess;
    } catch (e) {
      console.error('Web MIDI not available:', e);
      midiPorts = [];
      lastMidiRefreshSignature = '';
      clearMidiSelection();
      renderMidiDeviceMenu('MIDI not available');
    }
  }
}

async function toggleMidiDeviceMenu() {
  if (midiMenuOpen) {
    closeMidiDeviceMenu();
    return;
  }

  await refreshMidiDevices();
  openMidiDeviceMenu();
}

function populateMidiDeviceMenu(ports, selectedPortId = '') {
  const nextSignature = JSON.stringify(ports.map(port => ({
    id: String(port.id),
    name: port.name
  })));
  const hasSelectedPort = selectedPortId && ports.some(port => String(port.id) === selectedPortId);

  midiPorts = ports.map(port => ({
    id: String(port.id),
    name: port.name
  }));

  if (nextSignature === lastMidiRefreshSignature) {
    if (selectedPortId && hasSelectedPort && selectedMidiPortId !== selectedPortId) {
      selectedMidiPortId = selectedPortId;
    }
    if (selectedPortId && !hasSelectedPort) {
      clearMidiSelection();
    }
    renderMidiDeviceMenu();
    updateMidiDeviceButton();
    return;
  }

  lastMidiRefreshSignature = nextSignature;
  renderMidiDeviceMenu();

  if (!selectedPortId) {
    updateMidiDeviceButton();
    return;
  }

  if (hasSelectedPort) {
    selectedMidiPortId = selectedPortId;
    updateMidiDeviceButton();
    return;
  }

  clearMidiSelection();
}

function renderMidiDeviceMenu(message) {
  const optionsMarkup = [
    `
      <button
        type="button"
        class="midi-device-option${selectedMidiPortId === '' ? ' selected' : ''}"
        data-port-id=""
        role="option"
        aria-selected="${selectedMidiPortId === '' ? 'true' : 'false'}"
      >
        <span class="status-dot disconnected"></span>
        <span class="midi-device-option-name">No MIDI Device</span>
      </button>
    `
  ];

  if (midiPorts.length > 0) {
    optionsMarkup.push(...midiPorts.map(port => `
    <button
      type="button"
      class="midi-device-option${selectedMidiPortId === port.id ? ' selected' : ''}"
      data-port-id="${port.id}"
      role="option"
      aria-selected="${selectedMidiPortId === port.id ? 'true' : 'false'}"
    >
      <span class="status-dot ${selectedMidiPortId === port.id && midiConnected ? 'connected' : 'disconnected'}"></span>
      <span class="midi-device-option-name">${port.name}</span>
    </button>
  `));
  }

  if (message) {
    optionsMarkup.push(`
      <div class="midi-device-empty" role="status">${message}</div>
    `);
  } else if (midiPorts.length === 0) {
    optionsMarkup.push(`
      <div class="midi-device-empty" role="status">No MIDI devices found</div>
    `);
  }

  elements.midiDeviceMenu.innerHTML = optionsMarkup.join('');
}

function openMidiDeviceMenu() {
  midiMenuOpen = true;
  elements.midiDeviceControl.classList.add('open');
  elements.midiDeviceButton.setAttribute('aria-expanded', 'true');
  elements.midiDeviceMenu.hidden = false;
}

function closeMidiDeviceMenu() {
  midiMenuOpen = false;
  elements.midiDeviceControl.classList.remove('open');
  elements.midiDeviceButton.setAttribute('aria-expanded', 'false');
  elements.midiDeviceMenu.hidden = true;
}

function handleMidiDeviceButtonKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    toggleMidiDeviceMenu();
  }
}

function handleMidiDeviceOptionClick(event) {
  const option = event.target.closest('[data-port-id]');
  if (!option) {
    return;
  }

  connectToMidiDevice(option.dataset.portId);
}

function handleDocumentClick(event) {
  if (!midiMenuOpen || elements.midiDeviceControl.contains(event.target)) {
    return;
  }

  closeMidiDeviceMenu();
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && midiMenuOpen) {
    closeMidiDeviceMenu();
    elements.midiDeviceButton.focus();
  }
}

function clearMidiSelection() {
  selectedMidiPortId = '';
  webMidiOutput = null;
  updateMidiStatus(false);
  updateMidiDeviceButton();
  renderMidiDeviceMenu();
}

async function connectToMidiDevice(portId = selectedMidiPortId) {
  const nextPortId = String(portId || '');
  
  if (!nextPortId) {
    clearMidiSelection();
    closeMidiDeviceMenu();
    return;
  }
  
  // Try Electron API first
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.connectMidi(parseInt(nextPortId, 10));
      if (result.success) {
        selectedMidiPortId = nextPortId;
        webMidiOutput = null;
        updateMidiStatus(true);
        closeMidiDeviceMenu();
        return;
      }
    } catch (e) {
      console.log('Electron MIDI connect failed, trying Web MIDI');
    }
  }
  
  // Fall back to Web MIDI
  if (window.midiAccess) {
    webMidiOutput = window.midiAccess.outputs.get(nextPortId);
    if (webMidiOutput) {
      selectedMidiPortId = nextPortId;
      updateMidiStatus(true);
      closeMidiDeviceMenu();
      return;
    }
  }

  clearMidiSelection();
  closeMidiDeviceMenu();
}

function updateMidiStatus(connected) {
  midiConnected = connected;
  updateMidiDeviceButton();
  renderMidiDeviceMenu();
}

function updateMidiDeviceButton() {
  const selectedPort = midiPorts.find(port => port.id === selectedMidiPortId);
  elements.midiStatusDot.className = `status-dot ${connectedStateClass()}`;
  elements.midiDeviceName.textContent = selectedPort ? selectedPort.name : 'No MIDI Device';
  elements.midiDeviceStatus.textContent = midiConnected && selectedPort ? 'Connected' : 'Not Connected';
}

function connectedStateClass() {
  return midiConnected ? 'connected' : 'disconnected';
}

async function sendPatch(patch) {
  const channel = parseInt(elements.midiChannel.value);

  if (!selectedMidiPortId || !midiConnected) {
    alert('Please connect to a MIDI device first');
    return;
  }
  
  // Try Electron API first
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.sendPatch({
        channel,
        msb: patch.msb,
        lsb: patch.lsb,
        pc: patch.pc
      });
      
      if (result.success) {
        elements.lastSent.textContent = `Sent: ${patch.name}`;
        flashPatchCard(patch);
        return;
      }
    } catch (e) {
      console.log('Electron send failed, trying Web MIDI');
    }
  }
  
  // Fall back to Web MIDI
  if (webMidiOutput) {
    const ch = channel - 1;
    webMidiOutput.send([0xB0 + ch, 0, patch.msb]);
    webMidiOutput.send([0xB0 + ch, 32, patch.lsb]);
    webMidiOutput.send([0xC0 + ch, patch.pc]);
    elements.lastSent.textContent = `Sent: ${patch.name}`;
    flashPatchCard(patch);
  }
}

function flashPatchCard(patch) {
  const card = document.querySelector(`.patch-card[data-id="${patch.id}"]`);
  if (card) {
    card.style.boxShadow = '0 0 20px var(--accent)';
    setTimeout(() => {
      card.style.boxShadow = '';
    }, 300);
  }
}

async function exportLogicPreset(patch) {
  if (!window.electronAPI) {
    alert('Export function not available in web mode');
    return;
  }

  try {
    const result = await window.electronAPI.exportPST({
      name: patch.name,
      category: patch.category,
      msb: patch.msb,
      lsb: patch.lsb,
      pc: patch.pc
    });

    if (result.success) {
      // Show success feedback
      const exportBtn = document.getElementById('exportBtn');
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
  } catch (e) {
    alert('Error exporting preset: ' + e.message);
  }
}

async function batchExportPresets(patches) {
  if (!window.electronAPI) {
    alert('Export function not available in web mode');
    return;
  }

  if (patches.length === 0) {
    alert('No patches selected');
    return;
  }

  // Ask user to select a directory
  const result = await window.electronAPI.exportBatchPST(patches.map(p => ({
    name: p.name,
    category: p.category,
    msb: p.msb,
    lsb: p.lsb,
    pc: p.pc
  })));

  if (result.success) {
    // Show success feedback
    const exportBtn = document.getElementById('batchExportBtn');
    if (exportBtn) {
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = `<span class="btn-icon">✓</span>Exported ${result.count} files!`;
      exportBtn.style.backgroundColor = 'var(--success)';
      setTimeout(() => {
        exportBtn.innerHTML = originalText;
        exportBtn.style.backgroundColor = '';
      }, 3000);
    }

    // Clear selection after successful export
    setTimeout(() => {
      clearMultiSelect();
    }, 3000);
  } else if (!result.canceled) {
    alert('Error exporting presets: ' + (result.error || 'Unknown error'));
  }
}

// Patch Loading
async function loadDefaultPatches() {
  if (window.electronAPI) {
    const data = await window.electronAPI.getDefaultPatches();
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
  // Add unique IDs
  patches = data.map((p, i) => ({ ...p, id: i }));
  
  // Extract categories
  const categorySet = new Set(patches.map(p => p.category));
  categories = Array.from(categorySet).sort();
  
  renderCategories();
  renderPatches();
  
  elements.patchesLoaded.textContent = `${patches.length} patches loaded`;
  elements.categoryCount.textContent = categories.length;
}

// Rendering
function renderCategories() {
  const filter = elements.categorySearch.value.toLowerCase();
  const filtered = categories.filter(c => c.toLowerCase().includes(filter));
  
  elements.categoryList.innerHTML = `
    <li class="category-item ${selectedCategory === null ? 'active' : ''}" data-category="">
      <span>All Patches</span>
      <span class="count">${patches.length}</span>
    </li>
    ${filtered.map(cat => {
      const count = patches.filter(p => p.category === cat).length;
      return `
        <li class="category-item ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">
          <span>${cat}</span>
          <span class="count">${count}</span>
        </li>
      `;
    }).join('')}
  `;
  
  // Add click handlers
  elements.categoryList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const category = item.dataset.category || null;
      selectCategory(category);
    });
  });
}

function selectCategory(category) {
  selectedCategory = category;
  elements.currentCategory.textContent = category || 'All Patches';
  renderCategories();
  renderPatches();
}

function renderPatches() {
  const search = elements.patchSearch.value.toLowerCase();
  
  let filtered = patches;
  
  if (selectedCategory) {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }
  
  if (search) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  }
  
  elements.patchCount.textContent = `${filtered.length} voices`;
  
  if (filtered.length === 0) {
    elements.patchList.innerHTML = `
      <div class="no-selection" style="grid-column: 1/-1;">
        <span class="no-selection-icon">🔍</span>
        <p>No patches found</p>
      </div>
    `;
    return;
  }
  
  elements.patchList.innerHTML = filtered.map(patch => {
    const isSelected = selectedPatch?.id === patch.id;
    const isMultiSelected = selectedPatches.some(p => p.id === patch.id);
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

  // Show/hide Select All button
  if (filtered.length > 0) {
    elements.selectAllBtn.style.display = 'flex';
    // Update button text based on current selection
    const allSelected = filtered.length > 0 && filtered.every(p => selectedPatches.some(sp => sp.id === p.id));
    elements.selectAllBtn.innerHTML = allSelected
      ? '<span class="btn-icon">☐</span>Deselect All'
      : '<span class="btn-icon">☑️</span>Select All';
  } else {
    elements.selectAllBtn.style.display = 'none';
  }
  
  // Add click handlers
  elements.patchList.querySelectorAll('.patch-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = parseInt(card.dataset.id);
      const patch = patches.find(p => p.id === id);

      // Check if the select icon was clicked
      if (e.target.closest('[data-action="toggle-select"]')) {
        e.stopPropagation();
        togglePatchSelection(patch);
        return;
      }

      // Multi-select with Cmd/Ctrl key
      if (e.metaKey || e.ctrlKey) {
        togglePatchSelection(patch);
      } else {
        selectPatch(patch);
      }
    });

    card.addEventListener('dblclick', (e) => {
      // Don't double-click if clicking the select icon
      if (e.target.closest('[data-action="toggle-select"]')) {
        return;
      }
      const id = parseInt(card.dataset.id);
      const patch = patches.find(p => p.id === id);
      sendPatch(patch);
    });
  });
}

function selectPatch(patch) {
  selectedPatch = patch;
  // Clear multi-select when single-selecting
  selectedPatches = [];
  renderPatches();
  renderDetails();
}

function togglePatchSelection(patch) {
  const index = selectedPatches.findIndex(p => p.id === patch.id);
  if (index >= 0) {
    // Deselect
    selectedPatches.splice(index, 1);
  } else {
    // Select
    selectedPatches.push(patch);
  }

  // Clear single selection when multi-selecting
  selectedPatch = null;

  renderPatches();
  renderDetails();
}

function clearMultiSelect() {
  selectedPatches = [];
  renderPatches();
  renderDetails();
}

function selectAllVisiblePatches() {
  // Get currently filtered patches
  const search = elements.patchSearch.value.toLowerCase();
  let filtered = patches;

  if (selectedCategory) {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  }

  // Check if all visible patches are already selected
  const allSelected = filtered.length > 0 && filtered.every(p => selectedPatches.some(sp => sp.id === p.id));

  if (allSelected) {
    // Deselect all visible patches
    filtered.forEach(patch => {
      const index = selectedPatches.findIndex(p => p.id === patch.id);
      if (index >= 0) {
        selectedPatches.splice(index, 1);
      }
    });
  } else {
    // Select all visible patches
    filtered.forEach(patch => {
      if (!selectedPatches.some(p => p.id === patch.id)) {
        selectedPatches.push(patch);
      }
    });
  }

  // Clear single selection when multi-selecting
  selectedPatch = null;

  renderPatches();
  renderDetails();
}

function renderDetails() {
  // Show multi-select export UI if multiple patches selected
  if (selectedPatches.length > 0) {
    elements.detailsContent.innerHTML = `
      <div class="patch-details">
        <div class="detail-category">Multi-Select Mode</div>
        <div class="detail-name">${selectedPatches.length} patches selected</div>

        <div class="multi-select-info">
          <div class="detail-row">
            <span class="label">Selected</span>
            <span class="value">${selectedPatches.length}</span>
          </div>
        </div>

        <button class="btn btn-primary" id="batchExportBtn">
          <span class="btn-icon">💾</span>
          Export All as Logic Presets
        </button>

        <button class="btn btn-secondary" id="clearSelectionBtn" style="margin-top: 8px;">
          <span class="btn-icon">✕</span>
          Clear Selection
        </button>

        <p style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin-top: 12px;">
          Cmd/Ctrl+Click to select/deselect patches
        </p>
      </div>
    `;

    document.getElementById('batchExportBtn').addEventListener('click', () => {
      batchExportPresets(selectedPatches);
    });

    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
      clearMultiSelect();
    });

    return;
  }

  if (!selectedPatch) {
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
      <div class="detail-category">${selectedPatch.category}</div>
      <div class="detail-name">${selectedPatch.name}</div>
      
      <div class="detail-values">
        <div class="detail-row">
          <span class="label">Program</span>
          <span class="value">${selectedPatch.pc}</span>
        </div>
        <div class="detail-row">
          <span class="label">Bank LSB</span>
          <span class="value">${selectedPatch.lsb}</span>
        </div>
        <div class="detail-row">
          <span class="label">Bank MSB</span>
          <span class="value">${selectedPatch.msb}</span>
        </div>
      </div>
      
      <button class="btn btn-primary send-btn" id="sendBtn" ${!midiConnected ? 'disabled' : ''}>
        <span class="btn-icon">🎵</span>
        Send to Genos
      </button>

      <button class="btn btn-secondary" id="exportBtn" style="margin-top: 8px;">
        <span class="btn-icon">💾</span>
        Export Logic Preset
      </button>

      <p style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin-top: 8px;">
        Double-click any patch to send quickly
      </p>
    </div>
  `;

  document.getElementById('sendBtn').addEventListener('click', () => {
    sendPatch(selectedPatch);
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    exportLogicPreset(selectedPatch);
  });
}

function filterCategories() {
  renderCategories();
}

function filterPatches() {
  renderPatches();
}

// Start the app
init();
