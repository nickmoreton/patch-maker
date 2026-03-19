const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Try to load the midi module
let midi;
try {
  midi = require('midi');
} catch (e) {
  console.log('MIDI module not available, will use Web MIDI API in renderer');
  midi = null;
}

let mainWindow;
let midiOutput = null;
const FAVOURITE_LISTS_FILENAME = 'favourite-lists.json';
const FAVOURITE_LISTS_VERSION = 1;

function parseInteger(value) {
  const nextValue = Number.parseInt(value, 10);
  return Number.isInteger(nextValue) ? nextValue : null;
}

function normalizeFavouritePatch(patch) {
  if (!patch || typeof patch !== 'object') {
    return null;
  }

  const category = typeof patch.category === 'string' ? patch.category.trim() : '';
  const name = typeof patch.name === 'string' ? patch.name.trim() : '';
  const msb = parseInteger(patch.msb);
  const lsb = parseInteger(patch.lsb);
  const pc = parseInteger(patch.pc);
  const channel = parseInteger(patch.channel);

  if (!category || !name || msb === null || lsb === null || pc === null) {
    return null;
  }

  return {
    category,
    name,
    msb,
    lsb,
    pc,
    channel: channel !== null && channel >= 1 && channel <= 16 ? channel : null
  };
}

function normalizeFavouriteList(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  const updatedAt = typeof entry.updatedAt === 'string' && !Number.isNaN(Date.parse(entry.updatedAt))
    ? entry.updatedAt
    : new Date(0).toISOString();
  const patches = Array.isArray(entry.patches)
    ? entry.patches.map(normalizeFavouritePatch).filter(Boolean)
    : [];

  if (!name || patches.length === 0) {
    return null;
  }

  return {
    name,
    updatedAt,
    patches
  };
}

function sortFavouriteLists(lists) {
  return [...lists].sort((left, right) => {
    const rightTime = Date.parse(right.updatedAt) || 0;
    const leftTime = Date.parse(left.updatedAt) || 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name);
  });
}

function getFavouriteListsPath() {
  return path.join(app.getPath('userData'), FAVOURITE_LISTS_FILENAME);
}

function readFavouriteListsStore() {
  const favouritesPath = getFavouriteListsPath();
  if (!fs.existsSync(favouritesPath)) {
    return {
      version: FAVOURITE_LISTS_VERSION,
      lists: []
    };
  }

  try {
    const content = fs.readFileSync(favouritesPath, 'utf-8');
    const parsed = JSON.parse(content);
    const lists = Array.isArray(parsed && parsed.lists)
      ? parsed.lists.map(normalizeFavouriteList).filter(Boolean)
      : [];

    return {
      version: FAVOURITE_LISTS_VERSION,
      lists: sortFavouriteLists(lists)
    };
  } catch (error) {
    return {
      version: FAVOURITE_LISTS_VERSION,
      lists: []
    };
  }
}

function writeFavouriteListsStore(store) {
  const favouritesPath = getFavouriteListsPath();
  const lists = Array.isArray(store && store.lists)
    ? store.lists.map(normalizeFavouriteList).filter(Boolean)
    : [];
  const nextStore = {
    version: FAVOURITE_LISTS_VERSION,
    lists: sortFavouriteLists(lists)
  };

  fs.mkdirSync(path.dirname(favouritesPath), { recursive: true });
  fs.writeFileSync(favouritesPath, JSON.stringify(nextStore, null, 2), 'utf-8');

  return nextStore;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  // Set a custom Dock icon during development on macOS
  if (process.platform === 'darwin') {
    const devIconPath = path.join(__dirname, '..', '..', 'assets', 'dock-icon-512.png');
    if (fs.existsSync(devIconPath) && app.dock) {
      const image = nativeImage.createFromPath(devIconPath);
      if (!image.isEmpty()) {
        app.dock.setIcon(image);
      }
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (midiOutput) {
    midiOutput.closePort();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-midi-outputs', async () => {
  if (!midi) return [];
  
  const output = new midi.Output();
  const ports = [];
  const portCount = output.getPortCount();
  
  for (let i = 0; i < portCount; i++) {
    ports.push({
      id: i,
      name: output.getPortName(i)
    });
  }
  output.closePort();
  return ports;
});

ipcMain.handle('connect-midi', async (event, portId) => {
  if (!midi) return { success: false, error: 'MIDI not available' };
  
  try {
    if (midiOutput) {
      midiOutput.closePort();
      midiOutput = null;
    }
    midiOutput = new midi.Output();
    midiOutput.openPort(portId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('disconnect-midi', async () => {
  if (midiOutput) {
    midiOutput.closePort();
    midiOutput = null;
  }

  return { success: true };
});

ipcMain.handle('send-patch', async (event, { channel, msb, lsb, pc }) => {
  if (!midi) return { success: false, error: 'MIDI not available' };
  if (!midiOutput) return { success: false, error: 'No MIDI port connected' };
  
  try {
    const ch = channel - 1; // MIDI channels are 0-indexed internally
    
    // Send Bank Select MSB (CC#0)
    midiOutput.sendMessage([0xB0 + ch, 0, msb]);
    
    // Send Bank Select LSB (CC#32)
    midiOutput.sendMessage([0xB0 + ch, 32, lsb]);
    
    // Send Program Change
    midiOutput.sendMessage([0xC0 + ch, pc]);
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-default-patches', async () => {
  const patchesPath = path.join(__dirname, '..', 'data', 'patches.json');
  if (fs.existsSync(patchesPath)) {
    try {
      const content = fs.readFileSync(patchesPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }
  return null;
});

ipcMain.handle('get-favourite-lists', async () => {
  try {
    const store = readFavouriteListsStore();
    return { success: true, lists: store.lists };
  } catch (error) {
    return { success: false, error: 'Unable to load favourite lists' };
  }
});

ipcMain.handle('save-favourite-list', async (event, payload) => {
  try {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const patches = Array.isArray(payload.patches)
      ? payload.patches.map(normalizeFavouritePatch).filter(Boolean)
      : [];

    if (!name) {
      return { success: false, error: 'Favourite name is required' };
    }

    if (patches.length === 0) {
      return { success: false, error: 'Cannot save an empty favourite list' };
    }

    const store = readFavouriteListsStore();
    const favourite = {
      name,
      updatedAt: new Date().toISOString(),
      patches
    };
    const nextLists = sortFavouriteLists([
      ...store.lists.filter(entry => entry.name !== name),
      favourite
    ]);
    const nextStore = writeFavouriteListsStore({ lists: nextLists });

    return {
      success: true,
      favourite,
      lists: nextStore.lists
    };
  } catch (error) {
    return { success: false, error: 'Unable to save favourite list' };
  }
});

ipcMain.handle('delete-favourite-list', async (event, name) => {
  try {
    const nextName = typeof name === 'string' ? name.trim() : '';
    if (!nextName) {
      return { success: false, error: 'Favourite name is required' };
    }

    const store = readFavouriteListsStore();
    const nextLists = store.lists.filter(entry => entry.name !== nextName);
    const nextStore = writeFavouriteListsStore({ lists: nextLists });

    return {
      success: true,
      lists: nextStore.lists
    };
  } catch (error) {
    return { success: false, error: 'Unable to delete favourite list' };
  }
});
