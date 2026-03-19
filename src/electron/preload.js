const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMidiOutputs: () => ipcRenderer.invoke('get-midi-outputs'),
  connectMidi: (portId) => ipcRenderer.invoke('connect-midi', portId),
  disconnectMidi: () => ipcRenderer.invoke('disconnect-midi'),
  sendPatch: (data) => ipcRenderer.invoke('send-patch', data),
  getDefaultPatches: () => ipcRenderer.invoke('get-default-patches'),
  getFavouriteLists: () => ipcRenderer.invoke('get-favourite-lists'),
  saveFavouriteList: (data) => ipcRenderer.invoke('save-favourite-list', data),
  deleteFavouriteList: (name) => ipcRenderer.invoke('delete-favourite-list', name)
});
