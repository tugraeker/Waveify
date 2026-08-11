import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import { Play, Pause, Wind, Brain, Flower2, X } from 'lucide-react'
import type { Song } from '@/types'

/* 110 — Nefes Odası: 4-7-8 ritmiyle nefes egzersizi */
export function BreathRoom() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle')
  const [count, setCount] = useState(0)
  const [cycles, setCycles] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!running) return
    let start = performance.now()
    let p: 'inhale' | 'hold' | 'exhale' = 'inhale'
    let cycleStart = start
    let current = 0
    const loop = (now: number) => {
      const t = now - start
      if (p === 'inhale') {
        current = 4
        const rem = Math.ceil(4 - t / 1000)
        setCount(Math.max(0, rem))
        if (t >= 4000) { p = 'hold'; start = now; setCount(7) }
      } else if (p === 'hold') {
        setCount(Math.max(0, 7 - Math.floor(t / 1000)))
        if (t >= 7000) { p = 'exhale'; start = now; setCount(8) }
      } else {
        setCount(Math.max(0, 8 - Math.floor(t / 1000)))
        if (t >= 8000) { p = 'inhale'; start = now; cycleStart = now; setCycles((c) => c + 1) }
      }
      setPhase(p)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running])

  const scale = phase === 'inhale' ? 1.25 : phase === 'hold' ? 1.25 : phase === 'exhale' ? 0.85 : 1
  const phaseText = phase === 'inhale' ? 'Nefes Al' : phase === 'hold' ? 'Tut' : phase === 'exhale' ? 'Nefes Ver' : 'Hazır mısın?'
  const phaseColor = phase === 'inhale' ? 'from-emerald-400/70 to-teal-400/70' : phase === 'hold' ? 'from-amber-400/70 to-orange-400/70' : 'from-indigo-400/70 to-violet-400/70'

  return (
    <div className="glass rounded-2xl p-6 border border-emerald-500/15 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-1 self-start">
        <Wind size={16} className="text-emerald-400" />
        <p className="text-sm font-bold text-white">Nefes Odası</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-5 self-start">4-7-8 ritmi: 4 sn al · 7 sn tut · 8 sn ver</p>
      <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${phaseColor} flex items-center justify-center transition-all duration-1000 shadow-2xl`} style={{ transform: `scale(${scale})` }}>
        <div className="absolute inset-3 rounded-full bg-surface-950/60 flex flex-col items-center justify-center">
          {phase === 'idle' ? <Flower2 size={28} className="text-emerald-300" /> : (
            <>
              <p className="text-4xl font-display font-bold tabular-nums">{count}</p>
              <p className="text-xs text-surface-300 mt-1">{phaseText}</p>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-5">Tamamlanan döngü: {cycles}</p>
      <button
        onClick={() => { setRunning(!running); if (!running) { setCycles(0); setCount(4); setPhase('inhale') } else setPhase('idle') }}
        className="mt-3 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
      >
        {running ? <><Pause size={13} /> Durdur</> : <><Play size={13} fill="currentColor" /> Başla</>}
      </button>
    </div>
  )
}

/* 116 — Meditasyon: katalogdan ambient akışlı seanslar */
const SESSIONS = [
  { name: 'Sakin Zihin', minutes: 5, desc: 'Güne yumuşak bir başlangıç', icon: '🧘' },
  { name: 'Odak', minutes: 10, desc: 'Derin çalışma için', icon: '🎯' },
  { name: 'Uyku Öncesi', minutes: 15, desc: 'Günü yavaşça kapat', icon: '🌙' },
]

export function Meditation() {
  const [session, setSession] = useState<number | null>(null)
  const [ambient, setAmbient] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const startedRef = useRef(0)
  const { setQueue, setCurrentSong, setIsPlaying } = useStore()

  useEffect(() => {
    if (session === null) return
    const total = SESSIONS[session].minutes * 60
    startedRef.current = Date.now()
    const iv = setInterval(() => {
      const left = total - Math.floor((Date.now() - startedRef.current) / 1000)
      if (left <= 0) {
        setSession(null)
        setIsPlaying(false)
        emitToast('🧘 Seans tamamlandı. Sakin kal!', 'success')
        clearInterval(iv)
      } else setSecondsLeft(left)
    }, 1000)
    return () => clearInterval(iv)
  }, [session])

  async function start(sessionIdx: number) {
    setSession(sessionIdx)
    setSecondsLeft(SESSIONS[sessionIdx].minutes * 60)
    setLoading(true)
    const { data } = await supabase
      .from('songs')
      .select('id,title,artist,cover_url,audio_url,album,genre,duration')
      .or('genre.ilike.%ambient%,genre.ilike.%lo-fi%,genre.ilike.%chill%')
      .limit(20)
    const list = (data as Song[]) || []
    if (!list.length) { setLoading(false); return }
    setQueue(list)
    setCurrentSong(list[0])
    setIsPlaying(true)
    setLoading(false)
  }

  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60

  return (
    <div className="glass rounded-2xl p-6 border border-violet-500/15 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={16} className="text-violet-400" />
        <p className="text-sm font-bold text-white">Meditasyon</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-4">Ambient sesler eşliğinde rehberli seanslar</p>
      {session === null ? (
        <div className="flex flex-col gap-2">
          {SESSIONS.map((sess, i) => (
            <button
              key={sess.name}
              onClick={() => start(i)}
              disabled={loading}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/60 hover:bg-surface-800 border border-surface-700 hover:border-violet-500/40 transition-all text-left"
            >
              <span className="text-xl">{sess.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{sess.name} · {sess.minutes} dk</p>
                <p className="text-[10px] text-surface-500">{sess.desc}</p>
              </div>
              <Play size={14} className="text-violet-400" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          <div className="w-32 h-32 rounded-full border-4 border-violet-500/40 flex items-center justify-center animate-pulse">
            <span className="text-3xl font-display font-bold tabular-nums">{m}:{s.toString().padStart(2, '0')}</span>
          </div>
          <p className="text-sm font-semibold text-violet-300 mt-4">{SESSIONS[session].icon} {SESSIONS[session].name}</p>
          <p className="text-[11px] text-surface-500 mt-1">{ambient.length > 0 ? `Ambient akış: ${ambient.length} şarkı` : 'Nefes al ve bırak...'}</p>
          <button onClick={() => setSession(null)} className="mt-4 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:text-white text-xs flex items-center gap-1.5">
            <X size={12} /> Seansı Bitir
          </button>
        </div>
      )}
    </div>
  )
}
