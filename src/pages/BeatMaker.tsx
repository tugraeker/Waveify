import { useEffect, useRef, useState } from 'react'
import { Play, Square, Music4, Volume2, Gauge } from 'lucide-react'
import { emitToast } from '@/hooks/useToast'

// WebAudio synthesized drums — zero external files, always works
const TRACKS = [
  { id: 'kick', label: 'Kick', color: 'from-rose-500 to-orange-500', icon: '🥁' },
  { id: 'clap', label: 'Clap', color: 'from-amber-400 to-yellow-500', icon: '👏' },
  { id: 'hihat', label: 'Hi-Hat', color: 'from-cyan-400 to-sky-500', icon: '🥁' },
  { id: 'snare', label: 'Snare', color: 'from-emerald-400 to-teal-500', icon: '🥁' },
]

export default function BeatMaker() {
  const ctxRef = useRef<AudioContext | null>(null)
  const step = useRef(0)
  const timerRef = useRef<number>(0)
  const patternRef = useRef<boolean[][]>(TRACKS.map(() => Array(8).fill(false)))
  const volumeRef = useRef(0.8)
  const [pattern, setPattern] = useState<boolean[][]>(patternRef.current)
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [volume, setVolume] = useState(0.8)
  const [activeStep, setActiveStep] = useState(-1)

  useEffect(() => {
    return () => { stopLoop(); ctxRef.current?.close().catch(() => {}) }
  }, [])

  function getCtx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  function kick(ctx: AudioContext, t: number, vol: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t); osc.stop(t + 0.28)
  }

  function clap(ctx: AudioContext, t: number, vol: number) {
    for (let i = 0; i < 3; i++) {
      const t0 = t + i * 0.012
      const noise = ctx.createBufferSource()
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate)
      const d = buffer.getChannelData(0)
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length)
      noise.buffer = buffer
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(vol * 0.9, t0)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07)
      noise.connect(bp).connect(gain).connect(ctx.destination)
      noise.start(t0); noise.stop(t0 + 0.08)
    }
  }

  function hihat(ctx: AudioContext, t: number, vol: number) {
    const noise = ctx.createBufferSource()
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
    const d = buffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    noise.buffer = buffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 7500
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    noise.connect(hp).connect(gain).connect(ctx.destination)
    noise.start(t); noise.stop(t + 0.06)
  }

  function snare(ctx: AudioContext, t: number, vol: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08)
    gain.gain.setValueAtTime(vol * 0.7, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t); osc.stop(t + 0.14)
    clap(ctx, t, vol * 0.35)
  }

  const sounds = { kick, clap, hihat, snare }

  function playStep(s: number) {
    const ctx = getCtx()
    const t = ctx.currentTime + 0.02
    patternRef.current.forEach((track, ti) => {
      if (track[s]) (sounds as any)[TRACKS[ti].id](ctx, t, volumeRef.current)
    })
  }

  function startLoop() {
    const ctx = getCtx()
    setPlaying(true)
    const interval = 60 / bpm / 2 * 1000
    timerRef.current = window.setInterval(() => {
      const s = step.current % 8
      playStep(s)
      setActiveStep(s)
      step.current++
    }, interval)
  }

  function stopLoop() {
    setPlaying(false)
    setActiveStep(-1)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = 0 }
    step.current = 0
  }

  function toggleStep(ti: number, si: number) {
    const next = patternRef.current.map((t, i) => (i === ti ? t.map((v, j) => (j === si ? !v : v)) : t))
    patternRef.current = next
    setPattern(next)
  }

  function randomBeat() {
    const next = TRACKS.map((_, ti) => Array.from({ length: 8 }, () => Math.random() < (ti === 0 ? 0.6 : ti === 2 ? 0.5 : 0.3)))
    patternRef.current = next
    setPattern(next)
    emitToast('🎲 Rastgele ritim üretildi', 'info')
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Music4 className="text-emerald-400" /> Beat Maker</h1>
          <p className="text-xs text-surface-500 mt-1">8 adımlık sentez drum machine — kayıt yok, tamamen tarayıcıda çalışır</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={randomBeat}
            className="h-10 px-3 rounded-xl text-xs font-semibold bg-surface-800/60 border border-surface-700 text-surface-300 hover:text-white transition-all"
          >
            🎲 Rastgele Ritim
          </button>
          <button
            onClick={() => (playing ? stopLoop() : startLoop())}
            className={`h-10 px-5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              playing ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400'
            }`}
          >
            {playing ? <Square size={15} /> : <Play size={15} fill="currentColor" />}
            {playing ? 'Durdur' : 'Çal'}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-surface-300">
            <Gauge size={14} className="text-wave-400" />
            Hız
            <button onClick={() => setBpm(Math.max(60, bpm - 5))} className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 text-white">−</button>
            <span className="w-12 text-center font-mono text-wave-300 tabular-nums">{bpm}</span>
            <button onClick={() => setBpm(Math.min(200, bpm + 5))} className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 text-white">+</button>
            <span className="text-surface-500 text-[10px]">BPM</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-300 flex-1 max-w-[300px]">
            <Volume2 size={14} className="text-wave-400" />
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); volumeRef.current = v }} className="flex-1 accent-wave-400" />
            <span className="font-mono text-wave-300 tabular-nums w-9 text-right">%{Math.round(volume * 100)}</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-2.5">
        {TRACKS.map((t, ti) => (
          <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
            <div className={`col-span-3 sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-white`}>
              <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-[11px]`}>{t.icon}</span>
              {t.label}
            </div>
            {Array.from({ length: 8 }).map((_, si) => (
              <button
                key={si}
                onClick={() => toggleStep(ti, si)}
                className={`aspect-square rounded-lg transition-all duration-100 border ${
                  pattern[ti][si]
                    ? `bg-gradient-to-br ${t.color} border-white/30 shadow-lg scale-95`
                    : 'bg-surface-800/70 border-surface-700/60 hover:bg-surface-700/60'
                } ${activeStep === si ? 'ring-2 ring-white/60' : ''}`}
              />
            ))}
          </div>
        ))}
        {Array.from({ length: 8 }).map((_, si) => (
          <span key={si} className="text-[9px] text-surface-600 font-mono col-span-1">
            {activeStep === si ? '▶' : si + 1}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-surface-600 mt-4 text-center">
        İpucu: sekme adımlarına tıkla, Çal'a bas — <span className="text-emerald-400/80">8D</span> efekti ile dinlemek için Oynatıyor'a gidip 8D sesi aç.
      </p>
    </div>
  )
}