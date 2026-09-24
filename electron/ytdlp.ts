import { app, ipcMain } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

function getYtDlpPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'bin', 'yt-dlp.exe')
  }
  return path.join(process.resourcesPath, 'bin', 'yt-dlp.exe')
}

function ytDlpJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), args, { timeout: 30000 })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) try { resolve(JSON.parse(stdout)) } catch { reject(new Error('JSON ayrıştırma hatası')) }
      else reject(new Error(stderr.trim() || `yt-dlp çıkış kodu: ${code}`))
    })
  })
}

function ytDlpBinary(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), args, { timeout: 120000 })
    const chunks: Buffer[] = []
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => chunks.push(d))
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(stderr.trim() || `yt-dlp çıkış kodu: ${code}`))
    })
  })
}

export function registerYtdlpHandlers() {
  ipcMain.handle('youtube:get-audio', async (_e, videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const info = await ytDlpJson(['--dump-json', '--no-warnings', '--no-playlist', url])
    const buffer = await ytDlpBinary([
      '-f', 'bestaudio',
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificate',
      '-o', '-',
      url,
    ])

    return {
      buffer,
      title: info.title || 'Bilinmeyen Başlık',
      artist: info.uploader || info.channel || 'Bilinmeyen Sanatçı',
      duration: parseInt(info.duration) || 0,
      coverUrl: info.thumbnail || '',
      videoId,
    }
  })
}
