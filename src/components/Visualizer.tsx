import { useRef, useEffect } from 'react'
import { useStore } from '@/store/store'

interface Props {
  analyserData: Uint8Array
  isPlaying: boolean
  className?: string
}

export default function Visualizer({ analyserData, isPlaying, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const dataRef = useRef(analyserData)
  const mode = useStore((s) => s.visualizerMode)
  const colorTheme = useStore((s) => s.visualizerColorTheme)
  const sensitivity = useStore((s) => s.visualizerSensitivity)

  dataRef.current = analyserData

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!isPlaying) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const draw = () => {
      const raw = dataRef.current
      const data = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) {
        data[i] = Math.min(255, Math.max(0, raw[i] * sensitivity))
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      switch (mode) {
        case 'bars': drawBars(ctx, canvas, data, colorTheme); break
        case 'wave': drawWave(ctx, canvas, data, colorTheme); break
        case 'circle': drawCircle(ctx, canvas, data, colorTheme); break
        case 'fire': drawFire(ctx, canvas, data, colorTheme); break
        case 'party': drawParty(ctx, canvas, data, colorTheme); break
        case 'spectrum': drawSpectrum(ctx, canvas, data, colorTheme); break
        case 'particles': drawParticles(ctx, canvas, data, colorTheme); break
        case 'dual': drawDual(ctx, canvas, data, colorTheme); break
        case 'stars': drawStars(ctx, canvas, data, colorTheme); break
        case 'concert': drawConcert(ctx, canvas, data, colorTheme); break
      }
    }

    draw()
    animRef.current = requestAnimationFrame(function tick() {
      draw()
      animRef.current = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, mode, colorTheme, sensitivity])

  return <canvas ref={canvasRef} className={className} width={400} height={64} />
}

function getColors(theme: string, v: number): [string, string] {
  switch (theme) {
    case 'rainbow': {
      const hue = (v * 360) % 360
      return [`hsla(${hue},100%,60%,${0.3 + v * 0.7})`, `hsla(${(hue + 30) % 360},100%,50%,${0.5 + v * 0.5})`]
    }
    case 'fire': return [`rgba(255,${Math.floor(v * 200)},0,${0.4 + v * 0.6})`, `rgba(255,${Math.floor(v * 100)},0,${0.6 + v * 0.4})`]
    case 'ice': return [`rgba(100,${200 + Math.floor(v * 55)},255,${0.3 + v * 0.7})`, `rgba(50,150,255,${0.5 + v * 0.5})`]
    case 'neon': return [`rgba(255,0,${Math.floor(v * 255)},${0.4 + v * 0.6})`, `rgba(0,255,${Math.floor(v * 200)},${0.5 + v * 0.5})`]
    case 'pastel': return [`hsla(200,50%,${60 + v * 30}%,${0.4 + v * 0.6})`, `hsla(150,40%,${70 + v * 20}%,${0.5 + v * 0.5})`]
    case 'mono': {
      const g = Math.floor(100 + v * 155)
      return [`rgba(${g},${g},${g},${0.4 + v * 0.6})`, `rgba(${g + 50},${g + 50},${g + 50},${0.6 + v * 0.4})`]
    }
    default: return [`rgba(15,171,166,${0.4 + v * 0.6})`, `rgba(34,199,192,${0.3 + v * 0.5})`]
  }
}

function drawBars(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const bars = 64
  const w = canvas.width / bars
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.8
    const x = i * w
    const [c1, c2] = getColors(theme, v)
    const grad = ctx.createLinearGradient(x, canvas.height / 2 - h / 2, x, canvas.height / 2 + h / 2)
    grad.addColorStop(0, c1)
    grad.addColorStop(0.5, c2)
    grad.addColorStop(1, c1)
    ctx.fillStyle = grad
    ctx.shadowColor = `rgba(15,171,166,${0.1 + v * 0.3})`
    ctx.shadowBlur = 8
    ctx.fillRect(x, canvas.height / 2 - h / 2, w - 1, h)
    ctx.shadowBlur = 0
  }
}

function drawWave(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  ctx.beginPath()
  const [, c2] = getColors(theme, 0.7)
  ctx.strokeStyle = c2
  ctx.lineWidth = 2
  for (let x = 0; x < canvas.width; x++) {
    const i = Math.min(Math.floor(x * data.length / canvas.width), data.length - 1)
    const v = data[i] / 255
    const y = canvas.height / 2 + (v - 0.5) * canvas.height * 0.8
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawParty(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const bars = 48
  const w = canvas.width / bars
  const time = Date.now() / 1000
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.95
    const x = i * w
    const [c1] = getColors(theme, (i + time * 4) / bars)
    ctx.fillStyle = c1
    ctx.globalAlpha = 0.6 + v * 0.4
    ctx.fillRect(x, canvas.height - h, w, h)
    ctx.globalAlpha = 0.3 + v * 0.3
    ctx.fillRect(x, Math.max(0, canvas.height - h - 4), w, 4)
  }
  ctx.globalAlpha = 1
}

function drawCircle(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const radius = Math.min(cx, cy) * 0.4
  const bars = 64
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const angle = (i / bars) * Math.PI * 2
    const r = radius + v * radius * 0.8
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, 2 + v * 3, 0, Math.PI * 2)
    const [c1] = getColors(theme, v)
    ctx.fillStyle = c1
    ctx.fill()
  }
}

function drawFire(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const bars = 32
  const w = canvas.width / bars
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.9
    const x = i * w
    if (theme === 'fire') {
      const r = Math.min(255, Math.floor(200 + v * 55))
      const g = Math.floor(v * 150)
      const b = Math.floor(v * 50)
      ctx.fillStyle = `rgb(${r},${g},${b})`
    } else {
      const [c1] = getColors(theme, v)
      ctx.fillStyle = c1
    }
    ctx.fillRect(x, canvas.height - h, w - 1, h)
  }
}

// Feature 1: Spectrum mode
function drawSpectrum(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const w = canvas.width / data.length
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255
    const h = v * canvas.height
    const x = i * w
    const [c1] = getColors(theme, i / data.length)
    ctx.fillStyle = c1
    ctx.globalAlpha = 0.4 + v * 0.6
    ctx.fillRect(x, canvas.height - h, Math.max(1, w - 0.5), h)
  }
  ctx.globalAlpha = 1
}

// Feature 1: Particles mode
let particlePositions: { x: number; y: number; vx: number; vy: number }[] = []
function drawParticles(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  if (particlePositions.length === 0) {
    particlePositions = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }))
  }
  const avg = Array.from(data).reduce((a, b) => a + b, 0) / data.length / 255
  const speed = 0.5 + avg * 2
  for (const p of particlePositions) {
    p.x += p.vx * speed
    p.y += p.vy * speed
    if (p.x < 0) p.x = canvas.width
    if (p.x > canvas.width) p.x = 0
    if (p.y < 0) p.y = canvas.height
    if (p.y > canvas.height) p.y = 0
    const v = data[Math.floor(p.x / canvas.width * data.length)] / 255
    const [c1] = getColors(theme, v)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 1.5 + v * 3, 0, Math.PI * 2)
    ctx.fillStyle = c1
    ctx.globalAlpha = 0.3 + v * 0.7
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// Feature: Stars mode (music galaxy — every band is a star)
let starField: { x: number; y: number; s: number }[] | null = null
function ensureStarField(canvas: HTMLCanvasElement) {
  if (!starField || starField.length !== 90) {
    starField = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.2 + 0.3,
    }))
  }
  return starField
}

function drawStars(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const field = ensureStarField(canvas)
  const time = Date.now() / 1000
  // Static deep-space dust
  for (const s of field) {
    const tw = 0.35 + 0.25 * Math.sin(time * 0.8 + s.x * 0.13)
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${tw * 0.35})`
    ctx.fill()
  }
  // Nebula glow from average energy
  const avg = Array.from(data).reduce((a, b) => a + b, 0) / data.length / 255
  const neb = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 2, canvas.width / 2, canvas.height / 2, canvas.height * 0.9)
  neb.addColorStop(0, `rgba(139,92,246,${0.12 + avg * 0.22})`)
  neb.addColorStop(0.6, `rgba(217,70,239,${0.05 + avg * 0.1})`)
  neb.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = neb
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Music stars: one per band
  const bands = 28
  for (let i = 0; i < bands; i++) {
    const v = data[Math.floor(i * data.length / bands)] / 255
    const sx = ((i + 0.5) / bands) * canvas.width + Math.sin(i * 12.9898) * 3
    const sy = canvas.height / 2 + (Math.sin(i * 78.233) * 0.32 + (v - 0.5) * 0.9) * canvas.height
    const r = 1 + v * 4.2
    const [c1, c2] = getColors(theme, v)
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = c1
    ctx.shadowColor = c2
    ctx.shadowBlur = 4 + v * 14
    ctx.fill()
    ctx.shadowBlur = 0
    // Beam for hot stars
    if (v > 0.7) {
      ctx.beginPath()
      ctx.moveTo(sx, sy - r)
      ctx.lineTo(sx + (v - 0.7) * 14, sy - r - 6)
      ctx.lineTo(sx - (v - 0.7) * 14, sy - r - 6)
      ctx.closePath()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = c2
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}

// Feature 1: Dual mode (bars on top half, wave on bottom)
function drawDual(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const halfH = canvas.height / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvas.width, halfH)
  ctx.clip()
  drawBars(ctx, canvas, data, theme)
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, halfH, canvas.width, halfH)
  ctx.clip()
  ctx.translate(0, 0)
  drawWave(ctx, canvas, data, theme)
  ctx.restore()
}

// Hype: Concert mode — searchlight beams + spark rain
function drawConcert(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array, theme: string) {
  const time = Date.now() / 1000
  const avg = Array.from(data).reduce((a, b) => a + b, 0) / data.length / 255

  // Dark stage haze
  const haze = ctx.createLinearGradient(0, 0, 0, canvas.height)
  haze.addColorStop(0, 'rgba(10,8,30,0.55)')
  haze.addColorStop(1, 'rgba(20,10,40,0.3)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Searchlight beams from top corners (energy-driven sweep)
  const beams = 3
  for (let i = 0; i < beams; i++) {
    const v = data[Math.floor(i * data.length * 0.3 / beams)] / 255
    const angle = Math.sin(time * 0.5 + i * 2.2) * 0.35 + (i - 1) * 0.5
    const len = canvas.height * (0.7 + v * 0.6)
    const x0 = (i / (beams - 1)) * canvas.width
    const x1 = x0 + Math.sin(angle) * len
    const [c1, c2] = getColors(theme, 0.4 + v * 0.5)
    const grad = ctx.createLinearGradient(x0, 0, x1, canvas.height)
    grad.addColorStop(0, c1.replace(/[\d.]+\)$/, `${0.25 + v * 0.35})`))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.moveTo(x0 - 2, 0)
    ctx.lineTo(x0 + 2, 0)
    ctx.lineTo(x1, canvas.height)
    ctx.lineTo(x0, canvas.height)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  }

  // Crowd shimmer dots on the floor
  for (let i = 0; i < 46; i++) {
    const v = data[Math.floor(i * data.length / 46)] / 255
    const x = (i / 46) * canvas.width + Math.sin(time + i) * 2
    const y = canvas.height - 2 - Math.abs(Math.sin(time * 1.3 + i * 0.7)) * 3
    const [c1] = getColors(theme, v)
    ctx.globalAlpha = 0.25 + v * 0.5
    ctx.fillStyle = c1
    ctx.fillRect(x, y, 3, 2)
  }
  ctx.globalAlpha = 1

  // Energy floor line
  const line = ctx.createLinearGradient(0, 0, canvas.width, 0)
  const [lc1, lc2] = getColors(theme, avg)
  line.addColorStop(0, lc1)
  line.addColorStop(1, lc2)
  ctx.strokeStyle = line
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 0; x <= canvas.width; x += 6) {
    const v = data[Math.floor(x * data.length / canvas.width)] / 255
    const y = canvas.height - 6 - v * canvas.height * 0.25
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}
