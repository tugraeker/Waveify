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
