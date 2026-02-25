const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: () => ipcRenderer.invoke('is-electron'),
  getVersion: () => ipcRenderer.invoke('get-version'),
})
