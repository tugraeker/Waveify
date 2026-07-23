/// <reference types="vite/client" />
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let rpc: any = null
let rpcReady = false
let rpcReconnectTimer: ReturnType<typeof setTimeout> | null = null
let rpcStartTime: number | null = null

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID || '1337133713371337'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const isDev = !app.isPackaged

autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update:checking')
})

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update:available', info)
})

autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update:not-available')
})

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update:progress', progress)
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:downloaded')
})

autoUpdater.on('error', (err) => {
  if (isDev) return
  const msg = err.message || ''
  if (msg.includes('404') || msg.includes('ENOENT') || msg.includes('latest.yml')) {
    mainWindow?.webContents.send('update:not-available')
    return
  }
  mainWindow?.webContents.send('update:error', 'Güncelleme kontrol edilemedi')
})

ipcMain.on('update:check', () => {
  if (isDev) return
  autoUpdater.checkForUpdates()
})

ipcMain.on('update:download', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall()
})

async function initDiscordRPC(retries = 3) {
  console.log('[RPC] initDiscordRPC called, CLIENT_ID:', CLIENT_ID)
  for (let i = 0; i < retries; i++) {
    try {
      rpcReady = false
      const { Client } = await import('@xhayper/discord-rpc')
      console.log('[RPC] Module loaded, creating client...')
      const client = new Client({ clientId: CLIENT_ID })
      client.on('ready', () => {
        console.log('[RPC] READY event received, user:', client.user?.username)
        rpc = client
        rpcReady = true
        if (rpcReconnectTimer) { clearTimeout(rpcReconnectTimer); rpcReconnectTimer = null }
        updateDiscordPresence(null, false)
      })
      client.on('disconnected', () => {
        console.log('[RPC] DISCONNECTED')
        rpcReady = false
        rpc = null
        rpcReconnectTimer = setTimeout(() => initDiscordRPC(3), 10000)
      })
      console.log('[RPC] Calling login()...')
      await client.login()
      console.log('[RPC] login() resolved successfully')
      return
    } catch (e) {
      console.log('[RPC] login() failed:', e)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
  console.log('[RPC] All retries exhausted')
}

function updateDiscordPresence(data: { title?: string; artist?: string; coverUrl?: string; isPlaying?: boolean; currentTime?: number; duration?: number } | null, isPlayingFallback?: boolean) {
  if (!data) return
  const song = data.title && data.artist ? { title: data.title, artist: data.artist } : null
  const playState = data.isPlaying ?? isPlayingFallback ?? false
  const curTime = data.currentTime ?? 0
  const dur = data.duration ?? 0
  const coverUrl = data.coverUrl || ''
  if (!rpc || !rpcReady) { console.log('[RPC] skip update - not ready'); return }
  try {
    const details = song ? song.title : 'Idle'
    const state = song ? song.artist : 'Waveify'
    const largeText = song ? `${song.title} - ${song.artist}` : 'Waveify'
    if (playState) {
      rpcStartTime = rpcStartTime || Date.now()
    } else {
      rpcStartTime = null
    }
    rpc.user?.setActivity({
      details,
      state,
      largeImageKey: coverUrl || 'waveify_logo',
      largeImageText: largeText,
      smallImageKey: playState ? 'play' : 'pause',
      smallImageText: playState ? 'Playing' : 'Paused',
      startTimestamp: playState && song ? (rpcStartTime || Date.now()) : undefined,
      instance: false,
    })
  } catch (e) { console.log('[RPC] setActivity error:', e) }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
    backgroundColor: '#121216',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    if (!app.isPackaged) mainWindow?.webContents.openDevTools()
  })

  const devUrl = import.meta.env.VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  initDiscordRPC()
})

app.on('window-all-closed', () => {
  if (rpcReconnectTimer) { clearTimeout(rpcReconnectTimer); rpcReconnectTimer = null }
  if (rpc) { try { rpc.destroy() } catch {} rpc = null }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

ipcMain.on('discord:update', (_e, data: { title?: string; artist?: string; coverUrl?: string; isPlaying?: boolean; currentTime?: number; duration?: number }) => {
  updateDiscordPresence(data)
})