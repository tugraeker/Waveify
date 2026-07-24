/// <reference types="vite/client" />
import { app, BrowserWindow, ipcMain, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
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
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://github.com/tugraeker/Waveify/releases/latest/download',
  channel: 'latest',
})

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
  console.log('[AutoUpdate] Error:', msg)
  if (msg.includes('404') || msg.includes('ENOENT') || msg.includes('latest.yml')) {
    mainWindow?.webContents.send('update:not-available')
    return
  }
  mainWindow?.webContents.send('update:error', msg.includes('Cannot') || msg.includes('connect') ? 'Sunucuya bağlanılamadı' : msg.slice(0, 100))
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

// Offline mode: cache songs to local filesystem
const cacheDir = path.join(app.getPath('userData'), 'song-cache')
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

ipcMain.handle('cache:save', async (_e, songId: string, audioUrl: string) => {
  try {
    const res = await net.fetch(audioUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const songPath = path.join(cacheDir, `${songId}.mp3`)
    fs.writeFileSync(songPath, buffer)
    return { success: true, path: songPath }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('cache:get', async (_e, songId: string) => {
  const songPath = path.join(cacheDir, `${songId}.mp3`)
  if (fs.existsSync(songPath)) {
    const buffer = fs.readFileSync(songPath)
    return { cached: true, buffer, path: songPath }
  }
  return { cached: false }
})

ipcMain.handle('cache:remove', async (_e, songId: string) => {
  const songPath = path.join(cacheDir, `${songId}.mp3`)
  if (fs.existsSync(songPath)) fs.unlinkSync(songPath)
  return { success: true }
})

ipcMain.handle('cache:list', async () => {
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.mp3'))
  return files.map(f => f.replace('.mp3', ''))
})

ipcMain.handle('cache:clear', async () => {
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.mp3'))
  files.forEach(f => fs.unlinkSync(path.join(cacheDir, f)))
  return { success: true, cleared: files.length }
})

ipcMain.handle('youtube:get-audio', async (_e, videoId: string) => {
  const ytdl = await import('@distube/ytdl-core')
  const info = await ytdl.getInfo(videoId, { requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } } })
  const format = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio', filter: 'audioonly' })
  if (!format) throw new Error('Ses formatı bulunamadı')
  const audioUrl = format.url
  const title = info.videoDetails.title
  const artist = info.videoDetails.author?.name || 'Bilinmeyen Sanatçı'
  const duration = parseInt(info.videoDetails.lengthSeconds) || 0
  const coverUrl = info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || ''

  const response = await fetch(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!response.ok) throw new Error(`Ses indirilemedi: ${response.status}`)
  const buffer = await response.arrayBuffer()

  return { buffer, title, artist, duration, coverUrl, videoId }
})