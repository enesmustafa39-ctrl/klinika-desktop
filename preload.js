const { contextBridge, ipcRenderer } = require('electron');

// Funksione të sigurta që faqja e konfigurimit mund t'i përdorë
contextBridge.exposeInMainWorld('klinikaDesktop', {
  isDesktop: true,
  getServer: () => ipcRenderer.invoke('klinika:getServer'),
  saveServer: (url) => ipcRenderer.invoke('klinika:saveServer', url),
});
