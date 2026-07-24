import { useRef, useEffect } from 'react'
import { useStore } from '@/store/store'
import type { VisualizerMode } from '@/types'

interface Props {
  analyserData: Uint8Array
  isPlaying: boolean
  className?: string
}

export default function Visualizer({ analyserData, isPlaying, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const mode = useStore((s) => s.visualizerMode)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const data = analyserData
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      switch (mode) {
        case 'bars': drawBars(ctx, canvas, data); break
        case 'wave': drawWave(ctx, canvas, data); break
        case 'circle': drawCircle(ctx, canvas, data); break
        case 'fire': drawFire(ctx, canvas, data); break
        case 'party': drawParty(ctx, canvas, data); break
      }
    }

    if (isPlaying) {
      draw()
      animRef.current = requestAnimationFrame(function tick() {
        draw()
        animRef.current = requestAnimationFrame(tick)
      })
    } else ctx.clearRect(0, 0, canvas.width, canvas.height)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, mode])

  return <canvas ref={canvasRef} className={className} width={400} height={64} />
}

function drawBars(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const bars = 64
  const w = canvas.width / bars
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.8
    const x = i * w
    const grad = ctx.createLinearGradient(x, canvas.height / 2 - h / 2, x, canvas.height / 2 + h / 2)
    grad.addColorStop(0, `rgba(15,171,166,${0.4 + v * 0.6})`)
    grad.addColorStop(0.5, `rgba(34,199,192,${0.3 + v * 0.5})`)
    grad.addColorStop(1, `rgba(15,171,166,${0.4 + v * 0.6})`)
    ctx.fillStyle = grad
    ctx.shadowColor = `rgba(15,171,166,${0.1 + v * 0.3})`
    ctx.shadowBlur = 8
    ctx.fillRect(x, canvas.height / 2 - h / 2, w - 1, h)
    ctx.shadowBlur = 0
  }
}

function drawWave(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.beginPath()
  ctx.strokeStyle = '#22c7c0'
  ctx.lineWidth = 2
  const step = Math.floor(data.length / canvas.width)
  for (let x = 0; x < canvas.width; x++) {
    const i = Math.min(Math.floor(x * data.length / canvas.width), data.length - 1)
    const v = data[i] / 255
    const y = canvas.height / 2 + (v - 0.5) * canvas.height * 0.8
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawParty(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array) {
  const bars = 48
  const w = canvas.width / bars
  const colors = ['#ff6b6b', '#ffa502', '#ffd43b', '#69db7c', '#22c7c0', '#748ffc', '#da77f2', '#f783ac']
  const time = Date.now() / 1000
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.95
    const x = i * w
    const colorIdx = Math.floor((i + time * 4) % colors.length)
    ctx.fillStyle = colors[colorIdx]
    ctx.globalAlpha = 0.6 + v * 0.4
    ctx.fillRect(x, canvas.height - h, w, h)
    ctx.globalAlpha = 0.3 + v * 0.3
    ctx.fillRect(x, Math.max(0, canvas.height - h - 4), w, 4)
  }
  ctx.globalAlpha = 1
}

function drawCircle(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
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
    ctx.fillStyle = `rgba(15,171,166,${0.3 + v * 0.7})`
    ctx.fill()
  }
}

function drawFire(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: Uint8Array) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const bars = 32
  const w = canvas.width / bars
  for (let i = 0; i < bars; i++) {
    const v = data[Math.floor(i * data.length / bars)] / 255
    const h = v * canvas.height * 0.9
    const x = i * w
    const r = Math.min(255, Math.floor(200 + v * 55))
    const g = Math.floor(v * 150)
    const b = Math.floor(v * 50)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x, canvas.height - h, w - 1, h)
  }
}