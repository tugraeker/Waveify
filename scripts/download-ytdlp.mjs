import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const binDir = join(__dirname, '..', 'bin')
const exePath = join(binDir, 'yt-dlp.exe')

if (existsSync(exePath) && statSync(exePath).size > 0) {
  console.log('✅ yt-dlp.exe zaten var, atlanıyor')
  process.exit(0)
}

if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true })

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
console.log('⬇️ yt-dlp.exe indiriliyor...')

const response = await fetch(url)
if (!response.ok) {
  console.error(`Hata: HTTP ${response.status}`)
  process.exit(1)
}

const buffer = Buffer.from(await response.arrayBuffer())
writeFileSync(exePath, buffer)
console.log(`✅ yt-dlp.exe indirildi (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
