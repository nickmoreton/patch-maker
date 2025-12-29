const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { generatePST, generateFilename } = require('./pst-generator');

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

app.whenReady().then(() => {
  // Set a custom Dock icon during development on macOS
  if (process.platform === 'darwin') {
    const devIconPath = path.join(__dirname, 'assets', 'dock-icon-512.png');
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

ipcMain.handle('export-pst', async (event, patchData) => {
  const { name, category, msb, lsb, pc } = patchData;

  try {
    // Generate filename
    const defaultFilename = generateFilename(category, name);

    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Logic Pro Preset',
      defaultPath: `${defaultFilename}.pst`,
      filters: [
        { name: 'Logic Pro Preset', extensions: ['pst'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    // Generate PST file
    const pstBuffer = generatePST({
      voiceName: name,
      program: pc,
      bankLSB: lsb,
      bankMSB: msb,
      midiChannel: 1,
      midiDestination: "MD-BT01"
    });

    // Write to file
    fs.writeFileSync(result.filePath, pstBuffer);

    return {
      success: true,
      filePath: result.filePath
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
});

ipcMain.handle('export-batch-pst', async (event, patchesData) => {
  try {
    // Show directory picker
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Directory for Batch Export',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const targetDir = result.filePaths[0];
    let successCount = 0;
    const errors = [];

    // Export each patch
    for (const patchData of patchesData) {
      try {
        const { name, category, msb, lsb, pc } = patchData;

        // Generate filename
        const filename = generateFilename(category, name);
        const filePath = path.join(targetDir, `${filename}.pst`);

        // Generate PST file
        const pstBuffer = generatePST({
          voiceName: name,
          program: pc,
          bankLSB: lsb,
          bankMSB: msb,
          midiChannel: 1,
          midiDestination: "MD-BT01"
        });

        // Write to file
        fs.writeFileSync(filePath, pstBuffer);
        successCount++;
      } catch (e) {
        errors.push({ name: patchData.name, error: e.message });
      }
    }

    if (errors.length > 0 && successCount === 0) {
      return {
        success: false,
        error: `Failed to export any files. First error: ${errors[0].error}`
      };
    }

    return {
      success: true,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
      directory: targetDir
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
});
