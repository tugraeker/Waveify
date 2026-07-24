import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const version = pkg.version

const releaseDir = join(root, 'release')
const productName = pkg.build?.productName || 'Waveify'
const files = readdirSync(releaseDir)
const exe = files.find(f => f.startsWith(`${productName}-${version}-`) && f.endsWith('-portable.exe'))
if (!exe) {
  console.error(`No ${productName}-${version}-portable.exe found in release/`)
  process.exit(1)
}

const exePath = join(releaseDir, exe)
const buf = readFileSync(exePath)
const sha512 = createHash('sha512').update(buf).digest('hex').toLowerCase()
const size = buf.length

const now = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z')

const yml = `version: ${version}
files:
  - url: ${exe}
    sha512: ${sha512}
    size: ${size}
path: ${exe}
sha512: ${sha512}
releaseDate: '${now}'
`

writeFileSync(join(releaseDir, 'latest.yml'), yml)
console.log(`✅ Generated release/latest.yml for ${version} (${exe})`)
