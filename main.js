const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

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
    }
    midiOutput = new midi.Output();
    midiOutput.openPort(portId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
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

ipcMain.handle('load-patches-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) return null;
  
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('get-default-patches', async () => {
  const patchesPath = path.join(__dirname, 'patches.json');
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
