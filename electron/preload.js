const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('komorebi', {
  getPaths: () => ipcRenderer.invoke('komorebi:paths'),
  setKomorebicPath: (p) => ipcRenderer.invoke('komorebi:setKomorebicPath', p),
  readConfig: () => ipcRenderer.invoke('komorebi:readConfig'),
  saveConfig: (config) => ipcRenderer.invoke('komorebi:saveConfig', { config }),
  saveAppsConfig: (apps) => ipcRenderer.invoke('komorebi:saveAppsConfig', { apps }),
  applyConfig: () => ipcRenderer.invoke('komorebi:applyConfig'),
  run: (args) => ipcRenderer.invoke('komorebi:run', { args }),
  state: () => ipcRenderer.invoke('komorebi:state'),
  focusedWindow: () => ipcRenderer.invoke('komorebi:focusedWindow'),
  masirStatus: () => ipcRenderer.invoke('komorebi:masirStatus'),
  masirToggle: () => ipcRenderer.invoke('komorebi:masirToggle'),
  masirStatus: () => ipcRenderer.invoke('komorebi:masirStatus'),
  masirToggle: () => ipcRenderer.invoke('komorebi:masirToggle'),
  pickKomorebic: () => ipcRenderer.invoke('komorebi:pickKomorebic'),
  pickConfig: () => ipcRenderer.invoke('komorebi:pickConfig'),
  log: (text) => ipcRenderer.invoke('komorebi:log', text)
});