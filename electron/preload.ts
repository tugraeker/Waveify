const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  platform: process.platform,
  updateDiscordPresence: (data: { title?: string; artist?: string; coverUrl?: string; isPlaying?: boolean; currentTime?: number; duration?: number }) =>
    ipcRenderer.send('discord:update', data),

  checkForUpdates: () => ipcRenderer.send('update:check'),
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),
  onUpdateChecking: (cb: any) => { ipcRenderer.on('update:checking', cb) },
  onUpdateAvailable: (cb: any) => { ipcRenderer.on('update:available', (_e: any, info: any) => cb(info)) },
  onUpdateNotAvailable: (cb: any) => { ipcRenderer.on('update:not-available', cb) },
  onUpdateProgress: (cb: any) => { ipcRenderer.on('update:progress', (_e: any, p: any) => cb(p)) },
  onUpdateDownloaded: (cb: any) => { ipcRenderer.on('update:downloaded', cb) },
  onUpdateError: (cb: any) => { ipcRenderer.on('update:error', (_e: any, msg: any) => cb(msg)) },
})
