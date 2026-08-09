export interface AmbientColors {
  primary: string
  secondary: string
}

const cache = new Map<string, Promise<AmbientColors>>()
const ANIMATED = new Set(['image/gif', 'image/webp', 'image/apng', 'image/avif'])

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h * 360, s, l]
}

function dominantColors(img: HTMLImageElement): AmbientColors {
  const W = 24, H = 24
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { primary: '15 171 166', secondary: '9 139 136' }
  try { ctx.drawImage(img, 0, 0, W, H) } catch { return { primary: '15 171 166', secondary: '9 139 136' } }
  let data: Uint8ClampedArray
  try { data = ctx.getImageData(0, 0, W, H).data } catch { return { primary: '15 171 166', secondary: '9 139 136' } }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number; sat: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const a = data[i + 3]
    if (a < 128) continue
    const [h, s, l] = rgbToHsl(r, g, b)
    if (l < 0.07 || l > 0.93 || s < 0.1) continue
    const key = `${Math.round(h / 20) * 20}-${Math.round(s / 0.15) * 15}-${Math.round(l / 0.15) * 15}`
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0, sat: 0 }
    bucket.r += r; bucket.g += g; bucket.b += b; bucket.count += 1; bucket.sat += s
    buckets.set(key, bucket)
  }
  if (buckets.size === 0) return { primary: '15 171 166', secondary: '9 139 136' }

  const ranked = [...buckets.values()].sort((x, y) => (x.count + x.sat * 8) - (y.count + y.sat * 8)).reverse()
  const pick = (b: { r: number; g: number; b: number; count: number; sat: number }) => {
    const n = b.count || 1
    let r = Math.round(b.r / n), g = Math.round(b.g / n), bl = Math.round(b.b / n)
    const [h, s, l] = rgbToHsl(r, g, bl)
    const target = { h, s: Math.min(0.55, s + 0.12), l: Math.min(0.38, Math.max(0.16, l)) }
    const sat = target.s, lig = target.l
    const c = (1 - Math.abs(2 * lig - 1)) * sat
    const x = c * (1 - Math.abs(((target.h / 60) % 2) - 1))
    const m = lig - c / 2
    let rr = 0, gg = 0, bb = 0
    if (target.h < 60) { rr = c; gg = x } else if (target.h < 120) { rr = x; gg = c } else if (target.h < 180) { gg = c; bb = x } else if (target.h < 240) { gg = x; bb = c } else if (target.h < 300) { rr = x; bb = c } else { rr = c; bb = x }
    r = Math.round((rr + m) * 255); g = Math.round((gg + m) * 255); bl = Math.round((bb + m) * 255)
    return `${r} ${g} ${bl}`
  }
  return { primary: pick(ranked[0]), secondary: ranked.length > 1 ? pick(ranked[1]) : pick(ranked[0]) }
}

export function getAmbientColors(url: string): Promise<AmbientColors> {
  const cached = cache.get(url)
  if (cached) return cached
  const p = new Promise<AmbientColors>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(dominantColors(img))
    img.onerror = () => resolve({ primary: '15 171 166', secondary: '9 139 136' })
    img.src = url
  })
  cache.set(url, p)
  if (cache.size > 64) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return p
}