import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

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

const MAX_RETRIES = 3
let buffer = null
let lastError = null

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    console.log(`Deneme ${attempt}/${MAX_RETRIES}: ${url}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) throw new Error('Boş yanıt alındı')
    break
  } catch (e) {
    lastError = e
    console.error(`Deneme ${attempt} başarısız: ${e.message}`)
    if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
}

if (!buffer) {
  console.error(`Hata: yt-dlp indirilemedi (${MAX_RETRIES} deneme): ${lastError?.message || 'bilinmeyen hata'}`)
  process.exit(1)
}

const sha256 = createHash('sha256').update(buffer).digest('hex')
writeFileSync(exePath, buffer)
console.log(`✅ yt-dlp.exe indirildi (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
console.log(`🔐 sha256: ${sha256}`)
console.log(`📁 yol: ${exePath}`)
