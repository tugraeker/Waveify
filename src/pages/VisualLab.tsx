import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/store'
import { Palette, Waves, Sparkles, Eye, Zap, Sun, Moon, Star, Circle, Square, Triangle, Hexagon, Settings, Maximize, Minimize } from 'lucide-react'

type VisualMode = 'waves' | 'particles' | 'neon' | 'holographic' | 'spectrum' | 'geometric' | 'galaxy'

interface VisualConfig {
  mode: VisualMode
  speed: number
  intensity: number
  colorShift: boolean
  mirror: boolean
  glow: boolean
}

const VISUAL_MODES: { id: VisualMode; label: string; icon: any; description: string }[] = [
  { id: 'waves', label: 'Dalgalar', icon: Waves, description: 'Müzikle senkronize dalga animasyonları' },
  { id: 'particles', label: 'Partiküller', icon: Sparkles, description: 'Dans eden ışık partikülleri' },
  { id: 'neon', label: 'Neon', icon: Zap, description: 'Neon ışık efektleri' },
  { id: 'holographic', label: 'Holografik', icon: Eye, description: 'Holografik renk kayması' },
  { id: 'spectrum', label: 'Spektrum', icon: BarChart3, description: 'Frekans spektrumu görselleştirmesi' },
  { id: 'geometric', label: 'Geometrik', icon: Hexagon, description: 'Geometrik şekiller dansı' },
  { id: 'galaxy', label: 'Galaksi', icon: Star, description: 'Galaksi ve yıldız efektleri' },
]

function BarChart3({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="8" width="4" height="13" />
      <rect x="17" y="4" width="4" height="17" />
    </svg>
  )
}

export default function VisualLab() {
  const { currentSong, isPlaying } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [config, setConfig] = useState<VisualConfig>({
    mode: 'waves',
    speed: 1,
    intensity: 1,
    colorShift: true,
    mirror: true,
    glow: true,
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [audioData, setAudioData] = useState<number[]>(new Array(64).fill(0))

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let time = 0
    const animate = () => {
      time += 0.016 * config.speed
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      // Background gradient
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
      bgGrad.addColorStop(0, 'rgba(15, 10, 30, 1)')
      bgGrad.addColorStop(1, 'rgba(5, 2, 15, 1)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      const centerY = h / 2
      const centerX = w / 2

      // Get average audio level for reactivity
      const avgLevel = audioData.reduce((a, b) => a + b, 0) / audioData.length / 255
      const reactivity = 0.3 + avgLevel * 0.7 * config.intensity

      switch (config.mode) {
        case 'waves':
          drawWaves(ctx, w, h, time, reactivity, config)
          break
        case 'particles':
          drawParticles(ctx, w, h, time, reactivity, config)
          break
        case 'neon':
          drawNeon(ctx, w, h, time, reactivity, config)
          break
        case 'holographic':
          drawHolographic(ctx, w, h, time, reactivity, config)
          break
        case 'spectrum':
          drawSpectrum(ctx, w, h, time, reactivity, config, audioData)
          break
        case 'geometric':
          drawGeometric(ctx, w, h, time, reactivity, config)
          break
        case 'galaxy':
          drawGalaxy(ctx, w, h, time, reactivity, config)
          break
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [config, audioData])

  // Audio analysis
  useEffect(() => {
    if (!isPlaying) return

    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext()
        }
        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 128
        }

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const updateData = () => {
          if (!analyserRef.current || !isPlaying) return
          analyserRef.current.getByteFrequencyData(dataArray)
          setAudioData(Array.from(dataArray))
          requestAnimationFrame(updateData)
        }
        updateData()
      } catch {}
    }

    initAudio()
  }, [isPlaying])

  const drawWaves = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const layers = 5
    for (let i = 0; i < layers; i++) {
      const y = h / 2 + (i - layers / 2) * 30 * reactivity
      const hue = cfg.colorShift ? (time * 20 + i * 40) % 360 : 270

      ctx.beginPath()
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.3 - i * 0.05})`
      ctx.lineWidth = 3 - i * 0.4

      for (let x = 0; x < w; x += 2) {
        const wave = Math.sin(x * 0.02 + time * 2 + i * 0.5) * 30 * reactivity
        const wave2 = Math.sin(x * 0.01 + time * 1.5) * 20 * reactivity
        const py = y + wave + wave2
        if (x === 0) ctx.moveTo(x, py)
        else ctx.lineTo(x, py)
      }
      ctx.stroke()

      if (cfg.glow) {
        ctx.shadowBlur = 20
        ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`
      }
    }
    ctx.shadowBlur = 0

    if (cfg.mirror) {
      ctx.save()
      ctx.translate(0, h)
      ctx.scale(1, -1)
      for (let i = 0; i < layers; i++) {
        const y = h / 2 + (i - layers / 2) * 30 * reactivity
        const hue = cfg.colorShift ? (time * 20 + i * 40) % 360 : 270
        ctx.beginPath()
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.15 - i * 0.02})`
        ctx.lineWidth = 2 - i * 0.3
        for (let x = 0; x < w; x += 2) {
          const wave = Math.sin(x * 0.02 + time * 2 + i * 0.5) * 30 * reactivity
          const py = h / 2 + wave
          if (x === 0) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const drawParticles = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const count = 100
    for (let i = 0; i < count; i++) {
      const seed = i * 0.1
      const x = (Math.sin(seed + time * 0.5) * 0.5 + 0.5) * w
      const y = (Math.cos(seed * 1.3 + time * 0.3) * 0.5 + 0.5) * h
      const size = 2 + Math.sin(seed + time) * 2 * reactivity
      const hue = cfg.colorShift ? (time * 30 + i * 3.6) % 360 : 270

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + reactivity * 0.3})`
      ctx.fill()

      if (cfg.glow) {
        ctx.shadowBlur = 15
        ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.6)`
      }

      // Connection lines
      for (let j = i + 1; j < Math.min(i + 5, count); j++) {
        const seed2 = j * 0.1
        const x2 = (Math.sin(seed2 + time * 0.5) * 0.5 + 0.5) * w
        const y2 = (Math.cos(seed2 * 1.3 + time * 0.3) * 0.5 + 0.5) * h
        const dist = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2)
        if (dist < 100) {
          ctx.beginPath()
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${(1 - dist / 100) * 0.2})`
          ctx.lineWidth = 0.5
          ctx.moveTo(x, y)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
    }
    ctx.shadowBlur = 0
  }

  const drawNeon = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const lines = 8
    for (let i = 0; i < lines; i++) {
      const angle = (i / lines) * Math.PI * 2 + time * 0.5
      const len = 100 + reactivity * 100
      const x1 = w / 2 + Math.cos(angle) * 50
      const y1 = h / 2 + Math.sin(angle) * 50
      const x2 = w / 2 + Math.cos(angle) * len
      const y2 = h / 2 + Math.sin(angle) * len

      const hue = cfg.colorShift ? (time * 40 + i * 45) % 360 : 270

      ctx.beginPath()
      ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`
      ctx.lineWidth = 3
      ctx.shadowBlur = 30
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Glow ring
      ctx.beginPath()
      ctx.arc(x2, y2, 5 + reactivity * 5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.6)`
      ctx.fill()
    }
    ctx.shadowBlur = 0
  }

  const drawHolographic = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const stripes = 20
    for (let i = 0; i < stripes; i++) {
      const y = (i / stripes) * h
      const offset = Math.sin(time * 2 + i * 0.3) * 20 * reactivity
      const hue = (time * 50 + i * 18) % 360

      ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.1)`
      ctx.fillRect(0, y + offset, w, h / stripes)
    }

    // Rainbow overlay
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    for (let i = 0; i <= 6; i++) {
      gradient.addColorStop(i / 6, `hsla(${(time * 30 + i * 60) % 360}, 80%, 50%, 0.1)`)
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig, data: number[]) => {
    const bars = data.length
    const barWidth = w / bars

    for (let i = 0; i < bars; i++) {
      const value = data[i] / 255
      const barHeight = value * h * 0.8 * reactivity
      const hue = cfg.colorShift ? (i / bars * 360 + time * 20) % 360 : 270

      ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.8)`
      ctx.shadowBlur = 10
      ctx.shadowColor = `hsla(${hue}, 80%, 50%, 0.5)`
      ctx.fillRect(i * barWidth + 1, h - barHeight, barWidth - 2, barHeight)

      if (cfg.mirror) {
        ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.3)`
        ctx.fillRect(i * barWidth + 1, 0, barWidth - 2, barHeight * 0.3)
      }
    }
    ctx.shadowBlur = 0
  }

  const drawGeometric = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const shapes = 6
    for (let i = 0; i < shapes; i++) {
      const angle = (i / shapes) * Math.PI * 2 + time * 0.3
      const radius = 80 + reactivity * 60
      const x = w / 2 + Math.cos(angle) * radius
      const y = h / 2 + Math.sin(angle) * radius
      const size = 20 + reactivity * 20
      const hue = cfg.colorShift ? (time * 30 + i * 60) % 360 : 270

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(time + i)

      ctx.beginPath()
      const sides = 3 + (i % 4)
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * Math.PI * 2
        const px = Math.cos(a) * size
        const py = Math.sin(a) * size
        if (j === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.7)`
      ctx.lineWidth = 2
      ctx.shadowBlur = 20
      ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`
      ctx.stroke()

      ctx.restore()
    }
    ctx.shadowBlur = 0
  }

  const drawGalaxy = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, reactivity: number, cfg: VisualConfig) => {
    const stars = 200
    for (let i = 0; i < stars; i++) {
      const seed = i * 0.01
      const angle = seed * 100 + time * 0.2
      const dist = (seed * 200 + time * 10) % (Math.min(w, h) * 0.4)
      const x = w / 2 + Math.cos(angle) * dist
      const y = h / 2 + Math.sin(angle) * dist * 0.6
      const size = 1 + Math.sin(seed + time) * 1.5 * reactivity
      const hue = cfg.colorShift ? (seed * 360 + time * 10) % 360 : 270

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${0.5 + reactivity * 0.3})`
      ctx.fill()

      if (cfg.glow && size > 1.5) {
        ctx.shadowBlur = 10
        ctx.shadowColor = `hsla(${hue}, 70%, 70%, 0.6)`
      }
    }

    // Core glow
    const coreGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 50 + reactivity * 30)
    coreGrad.addColorStop(0, `hsla(270, 80%, 70%, ${0.3 + reactivity * 0.2})`)
    coreGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = coreGrad
    ctx.fillRect(0, 0, w, h)
    ctx.shadowBlur = 0
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Eye size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Visual Lab</h1>
              <p className="text-xs text-surface-400">Müzikle senkronize görsel deneyimler</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(!showSettings)}
              className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors">
              <Settings size={18} />
            </button>
            <button onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
          {VISUAL_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setConfig({ ...config, mode: mode.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap ${
                config.mode === mode.id
                  ? 'bg-wave-500/10 border-wave-500/50 text-wave-400'
                  : 'bg-surface-800/60 border-surface-700 text-surface-300 hover:border-surface-500'
              }`}
            >
              <mode.icon size={16} />
              <span className="text-sm">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-4xl mx-auto px-4">
        <div className={`relative rounded-3xl overflow-hidden border border-surface-800/50 bg-black ${
          isFullscreen ? 'h-screen' : 'aspect-video'
        }`}>
          <canvas ref={canvasRef} className="w-full h-full" />

          {/* Now Playing Overlay */}
          {currentSong && (
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center overflow-hidden">
                {currentSong.cover_url ? (
                  <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🎵</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
                <p className="text-xs text-white/60 truncate">{currentSong.artist}</p>
              </div>
              {isPlaying && (
                <div className="flex gap-1 items-end h-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 8}px`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Görsel Ayarları</h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-400">Hız</span>
                  <span className="text-xs text-wave-400">{config.speed.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.1" max="3" step="0.1" value={config.speed}
                  onChange={(e) => setConfig({ ...config, speed: Number(e.target.value) })}
                  className="w-full accent-wave-400" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-400">Yoğunluk</span>
                  <span className="text-xs text-wave-400">{Math.round(config.intensity * 100)}%</span>
                </div>
                <input type="range" min="0.1" max="2" step="0.1" value={config.intensity}
                  onChange={(e) => setConfig({ ...config, intensity: Number(e.target.value) })}
                  className="w-full accent-wave-400" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">Renk Değişimi</span>
                <button onClick={() => setConfig({ ...config, colorShift: !config.colorShift })}
                  className={`w-11 h-6 rounded-full transition-all ${config.colorShift ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${config.colorShift ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">Simetri</span>
                <button onClick={() => setConfig({ ...config, mirror: !config.mirror })}
                  className={`w-11 h-6 rounded-full transition-all ${config.mirror ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${config.mirror ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">Parıltı</span>
                <button onClick={() => setConfig({ ...config, glow: !config.glow })}
                  className={`w-11 h-6 rounded-full transition-all ${config.glow ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${config.glow ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
