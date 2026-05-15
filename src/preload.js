const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  showMenu: () => ipcRenderer.invoke('pet:show-menu'),
  minimize: () => ipcRenderer.invoke('pet:minimize'),
  setMouseEventsIgnored: (ignored) => ipcRenderer.invoke('pet:set-mouse-events-ignored', ignored),
  getAssetRootUrl: () => ipcRenderer.invoke('pet:get-asset-root-url'),
  getAssetFiles: () => ipcRenderer.invoke('pet:get-asset-files'),
  getAssets: () => ipcRenderer.invoke('pet:get-assets'),
  getWindowState: () => ipcRenderer.invoke('pet:get-window-state'),
  setWindowPosition: (position) => ipcRenderer.invoke('pet:set-window-position', position),
  setContentBounds: (bounds) => ipcRenderer.invoke('pet:set-content-bounds', bounds),
  beginDrag: () => ipcRenderer.invoke('pet:begin-drag'),
  dragWindow: () => ipcRenderer.invoke('pet:drag-window'),
  endDrag: () => ipcRenderer.invoke('pet:end-drag'),
  onSetAction: (callback) => ipcRenderer.on('pet:set-action', (_event, action) => callback(action)),
  onSayRandom: (callback) => ipcRenderer.on('pet:say-random', callback),
  onAssetsChanged: (callback) => ipcRenderer.on('pet:assets-changed', (_event, assets) => callback(assets))
});
