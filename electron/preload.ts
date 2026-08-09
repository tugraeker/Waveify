const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getYouTubeAudio: (videoId: string) => ipcRenderer.invoke('youtube:get-audio', videoId),
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

  // Global media controls (tray + shortcuts)
  onGlobalPlayPause: (cb: any) => { ipcRenderer.on('global:play-pause', () => cb()) },
  onGlobalNext: (cb: any) => { ipcRenderer.on('global:next', () => cb()) },
  onGlobalPrev: (cb: any) => { ipcRenderer.on('global:prev', () => cb()) },

  // Deep link
  deepLinkReady: () => ipcRenderer.send('deep-link:ready'),
  onDeepLink: (cb: any) => { ipcRenderer.on('deep-link:url', (_e: any, url: string) => cb(url)) },

  // Offline cache
  cacheSave: (songId: string, audioUrl: string) => ipcRenderer.invoke('cache:save', songId, audioUrl),
  cacheGet: (songId: string) => ipcRenderer.invoke('cache:get', songId),
  cacheRemove: (songId: string) => ipcRenderer.invoke('cache:remove', songId),
  cacheList: () => ipcRenderer.invoke('cache:list'),
  cacheClear: () => ipcRenderer.invoke('cache:clear'),
})
