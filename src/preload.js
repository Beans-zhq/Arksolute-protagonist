const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  showMenu: () => ipcRenderer.invoke('pet:show-menu'),
  minimize: () => ipcRenderer.invoke('pet:minimize'),
  onSetAction: (callback) => ipcRenderer.on('pet:set-action', (_event, action) => callback(action)),
  onSayRandom: (callback) => ipcRenderer.on('pet:say-random', callback)
});
