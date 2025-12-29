const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMidiOutputs: () => ipcRenderer.invoke('get-midi-outputs'),
  connectMidi: (portId) => ipcRenderer.invoke('connect-midi', portId),
  sendPatch: (data) => ipcRenderer.invoke('send-patch', data),
  loadPatchesFile: () => ipcRenderer.invoke('load-patches-file'),
  getDefaultPatches: () => ipcRenderer.invoke('get-default-patches'),
  exportPST: (patchData) => ipcRenderer.invoke('export-pst', patchData),
  exportBatchPST: (patchesData) => ipcRenderer.invoke('export-batch-pst', patchesData)
});
