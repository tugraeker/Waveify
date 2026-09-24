const { contextBridge, ipcRenderer } = require('electron')

export interface DiscordPresence {
  title?: string
  artist?: string
  coverUrl?: string
  isPlaying?: boolean
  currentTime?: number
  duration?: number
}

export interface YtAudioResult {
  buffer: Uint8Array
  title: string
  artist: string
  duration: number
  coverUrl: string
  videoId: string
}

export interface CacheSaveResult {
  success: boolean
  path?: string
  error?: string
}

export interface CacheGetResult {
  cached: boolean
  buffer?: Uint8Array
  path?: string
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  // yt-dlp (electron/ytdlp.ts, channel youtube:get-audio)
  getYouTubeAudio: (videoId: string) => Promise<YtAudioResult>
  downloadYt: (videoId: string) => Promise<YtAudioResult>
  minimize: () => void
  maximize: () => void
  close: () => void
  platform: NodeJS.Platform
  updateDiscordPresence: (data: DiscordPresence) => void
  checkForUpdates: () => void
  downloadUpdate: () => void
  installUpdate: () => void
  onUpdateChecking: (cb: () => void) => void
  onUpdateAvailable: (cb: (info: unknown) => void) => void
  onUpdateNotAvailable: (cb: () => void) => void
  onUpdateProgress: (cb: (p: unknown) => void) => void
  onUpdateDownloaded: (cb: () => void) => void
  onUpdateError: (cb: (msg: string) => void) => void
  onGlobalPlayPause: (cb: () => void) => void
  onGlobalNext: (cb: () => void) => void
  onGlobalPrev: (cb: () => void) => void
  // deep link (electron/deepLink.ts, waveify://song/:id -> #/song/:id)
  deepLinkReady: () => void
  onDeepLink: (cb: (url: string) => void) => void
  cacheSave: (songId: string, audioUrl: string) => Promise<CacheSaveResult>
  cacheGet: (songId: string) => Promise<CacheGetResult>
  cacheRemove: (songId: string) => Promise<{ success: boolean }>
  cacheList: () => Promise<string[]>
  cacheClear: () => Promise<{ success: boolean; cleared: number }>
}

// NOTE: the global Window.electronAPI augmentation lives in
// src/components/TitleBar.tsx (single declaration — do not duplicate here).
// Import this module's types there if the api surface grows.

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getYouTubeAudio: (videoId: string) => ipcRenderer.invoke('youtube:get-audio', videoId),
  downloadYt: (videoId: string) => ipcRenderer.invoke('youtube:get-audio', videoId),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  platform: process.platform,
  updateDiscordPresence: (data: DiscordPresence) =>
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
}

contextBridge.exposeInMainWorld('electronAPI', api)
