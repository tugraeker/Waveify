import { app, ipcMain, net, Notification } from 'electron'
import fs from 'fs'
import path from 'path'
import { getMainWindow } from './window'

export function setupAppHandlers() {
  ipcMain.on('window:minimize', () => getMainWindow()?.minimize())
  ipcMain.on('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => getMainWindow()?.close())

  ipcMain.on('notify:song', (_e, data: { title: string; artist: string }) => {
    const n = new Notification({ title: data.title, body: data.artist + ' — Waveify' })
    n.on('click', () => { getMainWindow()?.show(); getMainWindow()?.focus() })
    n.show()
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
}
