import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { audioEngine } from '@/lib/audioEngine'
import { formatDuration } from '@/lib/utils'
import { emitToast } from '@/hooks/useToast'
import { Play, Pause, X, Clock3, BookmarkPlus, MessageSquareText, Trash2 } from 'lucide-react'

/* 84 — Günlük hava durumu (deterministik, güne göre) */
const WEATHERS = ['rain', 'snow', 'fog', 'clear'] as const
export type DailyWeather = (typeof WEATHERS)[number]
export const WEATHER_META: Record<DailyWeather, { icon: string; label: string }> = {
  rain: { icon: '🌧️', label: 'Yağmurlu' },
  snow: { icon: '❄️', label: 'Karlı' },
  fog: { icon: '🌫️', label: 'Sisli' },
  clear: { icon: '☀️', label: 'Açık' },
}
export function useDailyWeather(): DailyWeather {
  return useMemo(() => {
    const d = new Date()
    const seed = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate()
    const r = seed % 10
    return r < 3 ? 'rain' : r < 5 ? 'snow' : r < 7 ? 'fog' : 'clear'
  }, [])
}

export function WeatherOverlay() {
  const w = useDailyWeather()
  const drops = useMemo(() => {
    const n = w === 'rain' ? 40 : w === 'snow' ? 26 : 0
    return Array.from({ length: n }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 3,
      dur: w === 'rain' ? 0.7 + Math.random() * 0.8 : 4 + Math.random() * 4,
    }))
  }, [w])
  const meta = WEATHER_META[w]
  return (
    <>
      <div className="fixed top-3 right-3 z-[70] glass rounded-full px-3 py-1.5 text-xs font-medium text-surface-300 border border-surface-700/50 shadow-lg animate-fade-in pointer-events-none">
        {meta.icon} {meta.label}
      </div>
      {w !== 'clear' && (
        <div className="fixed inset-0 z-[5] weather-layer">
          {w === 'rain' && drops.map((d, i) => <div key={i} className="rain-drop" style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />)}
          {w === 'snow' && drops.map((d, i) => <div key={i} className="snow-flake" style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />)}
          {w === 'fog' && <div className="fog-band" />}
        </div>
      )}
    </>
  )
}

/* 83 — Konser Modu: müzikle senkronize strobe + titreşim */
export function StrobeOverlay() {
  const strobeMode = useStore((s) => s.strobeMode)
  const isPlaying = useStore((s) => s.isPlaying)
  const [level, setLevel] = useState(0)
  useEffect(() => {
    if (!strobeMode || !isPlaying) return
    let lastVibe = 0
    const id = setInterval(() => {
      const data = audioEngine.getAnalyserData()
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i]
      const avg = data.length ? sum / data.length : 0
      setLevel(avg)
      const now = Date.now()
      if (avg > 150 && navigator.vibrate && now - lastVibe > 250) { lastVibe = now; navigator.vibrate(12) }
    }, 50)
    return () => clearInterval(id)
  }, [strobeMode, isPlaying])
  if (!strobeMode) return null
  return (
    <div
      className="fixed inset-0 z-[40] pointer-events-none"
      style={{ background: `rgba(20, 184, 166, ${Math.max(0, Math.min(0.3, (level - 130) / 260))})`, transition: 'background .05s linear' }}
    />
  )
}

/* 100 — Gonyometre: stereo genişlik görselleştirici */
export function Goniometer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf = 0
    const trails: { x: number; y: number; a: number }[] = []
    const loop = () => {
      const { l, r } = audioEngine.getStereoData()
      let lx = 0, rx = 0
      for (let i = 0; i < l.length; i++) { lx += l[i]; rx += r[i] }
      lx = ((lx / l.length) - 128) / 128 * 62
      rx = ((rx / r.length) - 128) / 128 * 62
      ctx.fillStyle = 'rgba(8, 12, 24, 0.16)'
      ctx.fillRect(0, 0, c.width, c.height)
      trails.push({ x: lx, y: rx, a: 1 })
      for (let i = trails.length - 1; i >= 0; i--) {
        trails[i].a *= 0.92
        if (trails[i].a < 0.04) trails.splice(i, 1)
      }
      ctx.globalCompositeOperation = 'lighter'
      for (const t of trails) {
        ctx.fillStyle = `rgba(34, 199, 192, ${t.a * 0.6})`
        ctx.fillRect(c.width / 2 + t.x, c.height / 2 + t.y, 2, 2)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath()
      ctx.moveTo(c.width / 2, 0); ctx.lineTo(c.width / 2, c.height)
      ctx.moveTo(0, c.height / 2); ctx.lineTo(c.width, c.height / 2)
      ctx.stroke()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} width={320} height={160} className="w-full h-16 rounded-xl bg-surface-950/60 border border-surface-800" />
}

/* 90 — Sıcaklık Haritası: ilerleme çubuğunda enerji segmentleri */
const energyCache = new Map<string, number[]>()
export function EnergySegments({ songId, duration }: { songId: string; duration: number }) {
  const [segs, setSegs] = useState<number[] | null>(energyCache.get(songId) || null)
  useEffect(() => {
    if (energyCache.has(songId)) { setSegs(energyCache.get(songId)!); return }
    let cancelled = false
    const song = useStore.getState().currentSong
    if (!song?.audio_url) return
    ;(async () => {
      try {
        const res = await fetch(song.audio_url!)
        const arr = await res.arrayBuffer()
        const ctx = new AudioContext()
        const buf = await ctx.decodeAudioData(arr)
        const data = buf.getChannelData(0)
        const segLen = Math.floor(buf.sampleRate * 2)
        const n = Math.max(1, Math.ceil(data.length / segLen))
        const out: number[] = []
        for (let i = 0; i < n; i++) {
          let sum = 0, cnt = 0
          for (let j = i * segLen; j < Math.min(data.length, (i + 1) * segLen); j++) { sum += Math.abs(data[j]); cnt++ }
          out.push(cnt ? sum / cnt : 0)
        }
        const max = Math.max(...out, 0.0001)
        const norm = out.map((v) => Math.min(1, v / max))
        energyCache.set(songId, norm)
        if (!cancelled) setSegs(norm)
        ctx.close().catch(() => {})
      } catch { /* çözülemedi */ }
    })()
    return () => { cancelled = true }
  }, [songId])
  if (!segs || segs.length === 0 || !duration) return null
  return (
    <div className="absolute inset-y-0 left-0 right-0 flex rounded-full overflow-hidden opacity-45">
      {segs.map((v, i) => (
        <div key={i} className="flex-1" style={{ background: `hsl(${150 - v * 130}, 85%, ${28 + v * 26}%)` }} />
      ))}
    </div>
  )
}

/* 179 — Saniye Yorumları */
export type TComment = { time: number; text: string; author: string; date: number }
export function getComments(songId: string): TComment[] {
  try { return JSON.parse(localStorage.getItem(`waveify_comments_${songId}`) || '[]') } catch { return [] }
}
export function CommentDots({ songId, duration, onSeek }: { songId: string; duration: number; onSeek: (t: number) => void }) {
  const [comments, setComments] = useState<TComment[]>(() => getComments(songId))
  useEffect(() => { setComments(getComments(songId)) }, [songId])
  if (!comments.length || !duration) return null
  return (
    <div className="absolute inset-0 pointer-events-none">
      {comments.map((cm, i) => (
        <button
          key={i}
          onClick={() => onSeek(cm.time)}
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] pointer-events-auto z-10 hover:scale-125 transition-transform"
          style={{ left: `${Math.min(99, (cm.time / duration) * 100)}%` }}
          title={`${formatDuration(cm.time)} — ${cm.author}: ${cm.text}`}
        />
      ))}
    </div>
  )
}
export function TimestampCommentsPanel({ songId, currentTime, onSeek }: { songId: string; currentTime: number; onSeek: (t: number) => void }) {
  const [comments, setComments] = useState<TComment[]>(() => getComments(songId))
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const user = useStore((s) => s.user)
  useEffect(() => { setComments(getComments(songId)); setOpen(false) }, [songId])
  function add() {
    if (!text.trim()) return
    const next = [{ time: Math.floor(currentTime), text: text.trim(), author: user?.username || 'Misafir', date: Date.now() }, ...getComments(songId)]
    localStorage.setItem(`waveify_comments_${songId}`, JSON.stringify(next.slice(0, 50)))
    setComments(next); setText('')
    emitToast('Yorum bu ana sabitlendi', 'success')
  }
  function del(i: number) {
    const next = comments.filter((_, j) => j !== i)
    localStorage.setItem(`waveify_comments_${songId}`, JSON.stringify(next))
    setComments(next)
  }
  return (
    <div className="w-full">
      <button onClick={() => setOpen(!open)} className={`text-xs transition-colors ${open ? 'text-amber-400' : 'text-surface-500 hover:text-amber-400'}`}>
        <MessageSquareText size={12} className="inline mr-1" />Saniye Yorumları ({comments.length})
      </button>
      {open && (
        <div className="mt-2 glass rounded-2xl p-3 border border-surface-800/50 animate-fade-in space-y-2">
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={`${formatDuration(currentTime)} anına yorum yaz...`}
              className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-xs text-white placeholder:text-surface-500 focus:outline-none focus:border-amber-400/50" />
            <button onClick={add} className="h-8 px-3 rounded-lg bg-amber-500/80 text-white text-xs font-medium hover:bg-amber-400 transition-colors">Ekle</button>
          </div>
          {comments.length === 0 && <p className="text-[11px] text-surface-500 text-center py-2">Henüz yorum yok — ilk saniyeyi sen sabitle!</p>}
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {comments.map((cm, i) => (
              <div key={i} className="flex items-start gap-2 bg-surface-800/50 rounded-lg px-2.5 py-2">
                <button onClick={() => onSeek(cm.time)} className="flex-shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5 hover:bg-amber-500/20 transition-colors">
                  {formatDuration(cm.time)}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white leading-snug">{cm.text}</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">{cm.author} · {new Date(cm.date).toLocaleDateString('tr-TR')}</p>
                </div>
                <button onClick={() => del(i)} className="text-surface-600 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* 107 — Yer İmleri */
type TBookmark = { time: number; label: string; date: number }
export function getBookmarks(songId: string): TBookmark[] {
  try { return JSON.parse(localStorage.getItem(`waveify_bookmarks_${songId}`) || '[]') } catch { return [] }
}
export function BookmarksPanel({ songId, currentTime, onSeek }: { songId: string; currentTime: number; onSeek: (t: number) => void }) {
  const [marks, setMarks] = useState<TBookmark[]>(() => getBookmarks(songId))
  const [label, setLabel] = useState('')
  const [open, setOpen] = useState(false)
  useEffect(() => { setMarks(getBookmarks(songId)); setOpen(false) }, [songId])
  function add() {
    const next = [...getBookmarks(songId), { time: Math.floor(currentTime), label: label.trim() || formatDuration(currentTime), date: Date.now() }]
    localStorage.setItem(`waveify_bookmarks_${songId}`, JSON.stringify(next.slice(-30)))
    setMarks(next); setLabel('')
    emitToast('🔖 Yer imi eklendi', 'success')
  }
  function del(i: number) {
    const next = marks.filter((_, j) => j !== i)
    localStorage.setItem(`waveify_bookmarks_${songId}`, JSON.stringify(next))
    setMarks(next)
  }
  return (
    <div className="w-full">
      <button onClick={() => setOpen(!open)} className={`text-xs transition-colors ${open ? 'text-wave-400' : 'text-surface-500 hover:text-wave-400'}`}>
        <BookmarkPlus size={12} className="inline mr-1" />Yer İmleri ({marks.length})
      </button>
      {open && (
        <div className="mt-2 glass rounded-2xl p-3 border border-surface-800/50 animate-fade-in space-y-2">
          <div className="flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={`${formatDuration(currentTime)}'a yer imi ekle (ad isteğe bağlı)`}
              className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-xs text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
            <button onClick={add} className="h-8 px-3 rounded-lg bg-wave-500 text-white text-xs font-medium hover:bg-wave-400 transition-colors">Ekle</button>
          </div>
          {marks.length === 0 && <p className="text-[11px] text-surface-500 text-center py-2">Uzun parçalarda önemli anları işaretle</p>}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {marks.map((m, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-800/50 rounded-lg px-2.5 py-1.5">
                <button onClick={() => onSeek(m.time)} className="flex-1 text-left">
                  <p className="text-xs text-white">{m.label}</p>
                  <p className="text-[10px] text-surface-500">{formatDuration(m.time)}</p>
                </button>
                <button onClick={() => del(i)} className="text-surface-600 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* 99 — Masa Saati Modu */
export function ClockMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentSong = useStore((s) => s.currentSong)
  const { isPlaying, currentTime, duration, togglePlay, seek } = useAudio()
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [open])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = WEATHER_META[useDailyWeather()]
  const hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds()
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  return (
    <div className="fixed inset-0 z-[200] bg-surface-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 animate-fade-in" onClick={onClose}>
      <button onClick={(e) => { e.stopPropagation(); onClose() }} className="absolute top-5 right-5 text-surface-500 hover:text-white transition-colors" title="Çık (Esc)">
        <X size={20} />
      </button>
      <p className="text-xs uppercase tracking-[0.3em] text-surface-500 mb-3">{now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p className="text-[16vw] md:text-[9rem] font-display font-bold text-white leading-none tabular-nums" style={{ textShadow: '0 0 60px rgba(34,199,192,0.25)' }}>
        {String(hh).padStart(2, '0')}<span className="animate-pulse text-wave-400">:</span>{String(mm).padStart(2, '0')}
      </p>
      <p className="text-sm text-surface-500 mt-2 font-mono tabular-nums">{String(ss).padStart(2, '0')} saniye</p>
      <div className="flex items-center gap-2 mt-8 text-xs text-surface-400">
        <span>{w.icon} {w.label}</span>
        <span className="text-surface-700">•</span>
        <span>🎵 {currentSong ? `${currentSong.title} — ${currentSong.artist}` : 'Şarkı yok'}</span>
      </div>
      {currentSong && (
        <div className="w-64 mt-4 flex flex-col items-center gap-3">
          <div className="w-full h-1 bg-surface-800 rounded-full overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - rect.left) / rect.width) * duration) }}>
            <div className="h-full bg-gradient-to-r from-wave-500 to-fuchsia-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-surface-500 font-mono tabular-nums">{formatDuration(currentTime)}</span>
            <button onClick={(e) => { e.stopPropagation(); togglePlay() }} className="bg-white text-surface-950 rounded-full p-2.5 hover:scale-105 transition-transform shadow-xl">
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            <span className="text-[11px] text-surface-500 font-mono tabular-nums">{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-surface-500">
            <Clock3 size={10} /> İlerlemek için çubuğa tıklayın · kapatmak için Esc
          </div>
        </div>
      )}
    </div>
  )
}
