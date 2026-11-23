'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  openFile: (opts) => ipcRenderer.invoke('open-file', opts),
  onOpenPath: (cb) => ipcRenderer.on('open-path', (_e, p, data) => cb(p, data)),
  onSaveAndClose: (cb) => ipcRenderer.on('save-and-close', () => cb()),
  // Updates
  updateInfo: () => ipcRenderer.invoke('update-info'),
  checkForUpdates: (manual) => ipcRenderer.invoke('update-check', !!manual),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  openDownloadPage: () => ipcRenderer.invoke('update-open-download'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_e, status) => cb(status)),
});
