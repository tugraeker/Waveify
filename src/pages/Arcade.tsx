import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'
import { resolveAudioUrl } from '@/lib/offline'
import { emitToast } from '@/hooks/useToast'
import { confettiBurst } from '@/lib/party'
import { Gamepad2, Music2, Zap, Skull, Ear, Palette, MessageSquareText, Grid3x3, Timer, Flag, Waves, Trophy } from 'lucide-react'
import type { Song } from '@/types'

const GAMES = [
  { id: 'rhythm', name: 'Ritim Hero', icon: Gamepad2, desc: 'Düşen notaları ritme bas' },
  { id: 'lyric', name: 'Söz Koşucusu', icon: MessageSquareText, desc: 'Eksik kelimeyi bul' },
  { id: 'pixel', name: 'Piksel Kapak', icon: Palette, desc: 'Pikselli kapağı tahmin et' },
  { id: 'speed', name: 'Hız Şoku', icon: Zap, desc: '2x hızda tanı' },
  { id: 'reverse', name: 'Ters Trivia', icon: Skull, desc: 'Tersten çalan kesiti bil' },
  { id: 'ear', name: 'Enstrüman Kulağı', icon: Ear, desc: 'Sentez sesi tanı' },
  { id: 'emoji', name: 'Emoji Bulmaca', icon: Music2, desc: 'Emoji şifresini çöz' },
  { id: 'wordle', name: 'Müzik Wordle', icon: Grid3x3, desc: '6 tahminde bul' },
  { id: 'edge', name: 'Giriş/Outro Avcısı', icon: Timer, desc: 'İlk ve son saniyeyi bil' },
  { id: 'hearing', name: 'Kulak Yaşı', icon: Ear, desc: 'İşitme seviyeni ölç' },
  { id: 'dino', name: 'Çevrimdışı Dino', icon: Flag, desc: 'İnternetsiz zıpla' },
  { id: 'simon', name: 'Melodi Taklit', icon: Music2, desc: 'Sırayı hatırla, tekrarla' },
  { id: 'blocks', name: 'Şarkı Blokları', icon: Grid3x3, desc: 'Eş blokları eşleştir' },
  { id: 'flappy', name: 'Flappy Note', icon: Waves, desc: 'Mikrofonla zıpla' },
  { id: 'escape', name: 'Kaçış Odası', icon: Skull, desc: '4 bilmece, 1 çıkış' },
  { id: 'tamagotchi', name: 'Wave Tamagotçi', icon: Flag, desc: 'Sanal evcilini besle' },
  { id: 'abtest', name: 'A-B İşitme Testi', icon: Ear, desc: 'Hangisi kayıpsız?' },
  { id: 'dance', name: 'Dans Pisti', icon: Zap, desc: 'Okları ritme bas' },
  { id: 'scratch', name: 'Plak Kazıma', icon: Palette, desc: 'DJ gibi sürt' },
  { id: 'season', name: 'Liderlik Sezonu', icon: Trophy, desc: 'Sezonun en iyileri' },
]

let arcadeAudio: HTMLAudioElement | null = null
function stopArcadeAudio() { if (arcadeAudio) { try { arcadeAudio.pause() } catch {}; arcadeAudio = null } }

export default function Arcade() {
  const [active, setActive] = useState<string | null>(null)
  const songs = useStore((s) => s.songs)
  const [pool, setPool] = useState<Song[]>([])
  useEffect(() => {
    let cancelled = false
    if (songs.length >= 4) { setPool(songs); return }
    supabase.from('songs').select('id,title,artist,cover_url,audio_url').not('audio_url', 'is', null).limit(300).then(({ data }) => {
      if (!cancelled && data?.length) { setPool(data as Song[]); useStore.getState().setSongs(data as Song[]) }
    })
    return () => { cancelled = true }
  }, [songs.length])

  useEffect(() => () => stopArcadeAudio(), [])
  const pick4 = (): Song[] => {
    const p = [...pool]
    const out: Song[] = []
    while (out.length < 4 && p.length) { out.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]) }
    return out
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wave-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-wave-500/20"><Gamepad2 size={20} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold">Arcade</h1>
            <p className="text-sm text-surface-400">Mini oyun galerisi — hepsi müzik zevkini test eder</p>
          </div>
        </div>

        {!active && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GAMES.map((g) => {
              const Icon = g.icon
              return (
                <button key={g.id} onClick={() => setActive(g.id)} className="text-left bg-surface-900/50 border border-surface-800 hover:border-wave-500/40 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group">
                  <div className="w-10 h-10 rounded-xl bg-wave-500/10 border border-wave-500/20 flex items-center justify-center mb-3 group-hover:bg-wave-500/20 transition-colors"><Icon size={18} className="text-wave-400" /></div>
                  <p className="text-sm font-semibold text-white">{g.name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{g.desc}</p>
                </button>
              )
            })}
          </div>
        )}

        {active && (
          <div>
            <button onClick={() => { setActive(null); stopArcadeAudio() }} className="mb-4 text-xs text-surface-400 hover:text-white transition-colors">← Oyunlara dön</button>
            {active === 'rhythm' && <RhythmHero />}
            {active === 'lyric' && <LyricRunner songs={pool} pick4={pick4} />}
            {active === 'pixel' && <PixelCover songs={pool} pick4={pick4} />}
            {active === 'speed' && <SpeedGame songs={pool} pick4={pick4} />}
            {active === 'reverse' && <ReverseGame songs={pool} pick4={pick4} />}
            {active === 'ear' && <EarGame />}
            {active === 'emoji' && <EmojiGame songs={pool} pick4={pick4} />}
            {active === 'wordle' && <WordleGame />}
            {active === 'edge' && <EdgeGame songs={pool} pick4={pick4} />}
            {active === 'hearing' && <HearingTest />}
            {active === 'dino' && <DinoGame />}
            {active === 'simon' && <SimonGame />}
            {active === 'blocks' && <SongBlocks songs={pool} />}
            {active === 'flappy' && <FlappyNote />}
            {active === 'escape' && <EscapeRoom songs={pool} pick4={pick4} />}
            {active === 'tamagotchi' && <Tamagotchi />}
            {active === 'abtest' && <ABTest songs={pool} pick4={pick4} />}
            {active === 'dance' && <DanceFloor />}
            {active === 'scratch' && <ScratchVinyl />}
            {active === 'season' && <SeasonBoard />}
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreHeader({ score, streak }: { score: number; streak: number }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="px-3 py-1.5 rounded-xl bg-surface-800/70 border border-surface-700 text-sm font-bold text-white">Puan: {score}</div>
      {streak >= 3 && <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-bold text-amber-300">🔥 {streak} seri</div>}
    </div>
  )
}

/* 51 — Rhythm Hero: falling notes, 3 lanes, ASK keys */
function RhythmHero() {
  const [bpm, setBpm] = useState(120)
  const [running, setRunning] = useState(false)
  const [notes, setNotes] = useState<{ lane: number; y: number; hit: boolean }[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const raf = useRef<number>(0)
  const lastSpawn = useRef(0)
  const lastHit = useRef(0)
  const lanes = [0, 1, 2]

  useEffect(() => {
    if (!running) return
    let start = performance.now()
    const tick = (now: number) => {
      const dt = now - start; start = now
      const elapsed = (now - lastSpawn.current)
      const interval = (60000 / bpm) * 2
      if (elapsed >= interval) {
        lastSpawn.current = now
        setNotes((n) => [...n, { lane: Math.floor(Math.random() * 3), y: 0, hit: false }])
      }
      setNotes((n) => n.map((x) => ({ ...x, y: x.y + (dt / 1000) * 120 })).filter((x) => !x.hit && x.y < 500))
      raf.current = requestAnimationFrame(tick)
    }
    lastSpawn.current = performance.now()
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [running, bpm])

  function hit(lane: number) {
    if (!running) return
    const now = performance.now()
    if (now - lastHit.current < 120) return
    lastHit.current = now
    setNotes((n) => {
      const idx = n.findIndex((x) => x.lane === lane && !x.hit && x.y > 250 && x.y < 410)
      if (idx >= 0) {
        const copy = [...n]; copy[idx] = { ...copy[idx], hit: true }
        setScore((s) => s + 10); setStreak((s) => s + 1)
        return copy
      }
      setStreak(0)
      return n
    })
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'KeyA') hit(0); if (e.code === 'KeyS') hit(1); if (e.code === 'KeyD') hit(2) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running])
  useEffect(() => { if (score > 0 && score % 100 === 0) saveArcadeScore('rhythm', score) }, [score])

  return (
    <div className="glass rounded-2xl p-5">
      <ScoreHeader score={score} streak={streak} />
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-surface-400">BPM</label>
        <input type="range" min={70} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 accent-wave-400" />
        <span className="text-sm text-white font-bold w-10 text-right">{bpm}</span>
        <button onClick={() => { if (!running) { setScore(0); setStreak(0); setNotes([]) } setRunning(!running) }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white text-sm font-semibold">{running ? 'Dur' : 'Başla'}</button>
      </div>
      <div className="relative h-64 bg-surface-950/60 border border-surface-800 rounded-2xl overflow-hidden">
        <div className="absolute top-[62%] left-0 right-0 h-0.5 bg-wave-500/60 z-10" />
        <div className="absolute inset-x-0 top-0 bottom-0 flex">
          {lanes.map((l) => (
            <div key={l} className="flex-1 border-r border-surface-800/60 last:border-r-0 flex items-end justify-center pb-10">
              <div className="h-full w-full relative">
                {notes.filter((n) => n.lane === l).map((n, i) => (
                  <div key={i} className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-wave-400 to-fuchsia-500 shadow-lg shadow-wave-500/40" style={{ top: n.y - 16 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-3 text-center">Çizgiye gelen notayı <b className="text-white">A / S / D</b> tuşlarıyla vur</p>
    </div>
  )
}

/* 53 — Lyric Runner */
function LyricRunner({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [song, setSong] = useState<Song | null>(null)
  const [playing, setPlaying] = useState(false)
  const [word, setWord] = useState('')
  const [opts, setOpts] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const words = useRef<string[]>([])

  function start(s: Song) {
    stopArcadeAudio()
    const audio = new Audio()
    arcadeAudio = audio
    resolveAudioUrl(s.audio_url || '').then((u) => { if (arcadeAudio === audio) { audio.src = u; audio.play().catch(() => {}) } })
    words.current = (s.title + ' ' + (s.artist || '')).toLowerCase().replace(/[^a-zçğıöşü ]/gi, ' ').split(/\s+/).filter((w) => w.length > 2)
    setSong(s); setPlaying(true); setScore(0); setStreak(0)
    nextWord()
  }
  function nextWord() {
    const ws = words.current
    if (!ws.length) return
    const w = ws[Math.floor(Math.random() * ws.length)]
    setWord(w)
    const fake = ws.filter((x) => x !== w).slice(0, 6)
    while (fake.length < 3) fake.push('melodi')
    setOpts([w, ...fake].sort(() => Math.random() - 0.5).slice(0, 4))
  }
  function answer(a: string) {
    if (a === word) { setScore((s) => s + 10); setStreak((s) => s + 1); if (streak + 1 >= 5) emitToast('🔥 Seri!', 'success') }
    else setStreak(0)
    setTimeout(nextWord, 350)
  }

  return (
    <div className="glass rounded-2xl p-5">
      <ScoreHeader score={score} streak={streak} />
      <div className="flex flex-wrap gap-2 mb-4">
        {songs.slice(0, 8).map((s) => (
          <button key={s.id} onClick={() => start(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${song?.id === s.id ? 'bg-wave-500/20 border-wave-500/50 text-wave-300' : 'bg-surface-800 border-surface-700 text-surface-300 hover:text-white'}`}>{s.title}</button>
        ))}
      </div>
      {playing && (
        <div className="text-center py-8">
          <p className="text-2xl font-display font-bold text-white mb-6">"{word.replace(/./g, '▢')}"</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
            {opts.map((o) => (
              <button key={o} onClick={() => answer(o)} className="px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 hover:border-wave-500/50 text-sm font-medium text-white transition-all">{o}</button>
            ))}
          </div>
          <p className="text-xs text-surface-500 mt-6">Şarkı çalarken eksik kelimeyi bul</p>
        </div>
      )}
    </div>
  )
}

/* 54 — Pixel Cover */
function PixelCover({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [opts, setOpts] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [score, setScore] = useState(0)
  const [reveal, setReveal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function newRound() {
    const p = pick4()
    if (p.length < 4) return
    setOpts(p); setCorrect(p[Math.floor(Math.random() * p.length)]); setReveal(false)
  }
  useEffect(() => { if (correct) newRound(); /* eslint-disable-line */ }, [])
  useEffect(() => {
    if (!correct) return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const px = 8
      const sw = Math.max(8, Math.floor(c.width / px)), sh = Math.max(8, Math.floor(c.height / px))
      ctx!.imageSmoothingEnabled = false
      ctx!.drawImage(img, 0, 0, sw, sh)
      ctx!.drawImage(c, 0, 0, sw, sh, 0, 0, c.width, c.height)
    }
    img.onerror = () => { ctx!.fillStyle = '#0f172a'; ctx!.fillRect(0, 0, c.width, c.height); ctx!.fillStyle = '#14b8a6'; ctx!.font = '24px sans-serif'; ctx!.textAlign = 'center'; ctx!.fillText('🎵', c.width / 2, c.height / 2 + 8) }
    img.src = correct.cover_url || ''
  }, [correct, reveal])

  function answer(s: Song) {
    if (reveal) return
    setReveal(true)
    if (s.id === correct?.id) { setScore((x) => x + 10); confettiBurst() }
    setTimeout(newRound, 1800)
  }

  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <canvas ref={canvasRef} width={320} height={320} className="w-56 h-56 mx-auto rounded-2xl border border-surface-700 shadow-2xl" />
      <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-lg mx-auto">
        {opts.map((o) => (
          <button key={o.id} onClick={() => answer(o)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${reveal && o.id === correct?.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-surface-800 border-surface-700 text-white hover:border-wave-500/50'}`}>{o.title} — {o.artist}</button>
        ))}
      </div>
      <button onClick={newRound} className="mt-4 text-xs text-wave-400 hover:text-wave-300">Yeni Tur</button>
    </div>
  )
}

/* 62 — Speed Game (2x recognition) */
function SpeedGame({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [opts, setOpts] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [score, setScore] = useState(0)
  const [playing, setPlaying] = useState(false)

  function newRound() {
    const p = pick4(); if (p.length < 4) return
    setOpts(p); setCorrect(p[Math.floor(Math.random() * p.length)]); setPlaying(false)
  }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  function play() {
    if (!correct?.audio_url) return
    stopArcadeAudio()
    const audio = new Audio()
    arcadeAudio = audio
    resolveAudioUrl(correct.audio_url).then((u) => {
      if (arcadeAudio !== audio) return
      audio.src = u; audio.playbackRate = 2; audio.play().catch(() => {})
    })
    setTimeout(() => { try { audio.pause() } catch {} }, 4000)
    setPlaying(true)
  }
  function answer(s: Song) {
    if (s.id === correct?.id) { setScore((x) => x + 10); emitToast('⚡ 2x tanıdın!', 'success') } else emitToast('❌ Bu hıza dayanamadı', 'error')
    stopArcadeAudio(); setTimeout(newRound, 800)
  }

  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <button onClick={play} disabled={playing || !correct?.audio_url} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold shadow-lg shadow-amber-500/20 disabled:opacity-40">⚡ 2x Kesit Çal</button>
      {playing && <p className="text-xs text-surface-400 mt-2 animate-pulse">Kesit dinleniyor...</p>}
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {opts.map((o) => (
          <button key={o.id} onClick={() => answer(o)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{o.title}</button>
        ))}
      </div>
    </div>
  )
}

/* 63 — Reverse Trivia (decoded buffer played backwards) */
function ReverseGame({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [opts, setOpts] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [score, setScore] = useState(0)
  const [busy, setBusy] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)

  function newRound() {
    const p = pick4(); if (p.length < 4) return
    setOpts(p); setCorrect(p[Math.floor(Math.random() * p.length)])
  }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  async function play() {
    if (!correct?.audio_url || busy) return
    setBusy(true)
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      const res = await fetch(correct.audio_url)
      const buf = await ctx.decodeAudioData(await res.arrayBuffer())
      const rev = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate)
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = rev.getChannelData(ch), s = buf.getChannelData(ch)
        for (let i = 0; i < buf.length; i++) d[i] = s[buf.length - 1 - i]
      }
      const src = ctx.createBufferSource()
      src.buffer = rev
      const g = ctx.createGain(); g.gain.value = 0.8
      src.connect(g); g.connect(ctx.destination)
      src.start(ctx.currentTime, 0, 5)
      setTimeout(() => { try { src.stop() } catch {} }, 5000)
    } catch { emitToast('Ses çözülemedi', 'error') }
    setBusy(false)
  }
  function answer(s: Song) {
    if (s.id === correct?.id) { setScore((x) => x + 10); emitToast('👂 Tersini bile bildin!', 'success') } else emitToast('❌ Tersine çevirdi seni', 'error')
    setTimeout(newRound, 700)
  }

  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <button onClick={play} disabled={busy} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-purple-500/20 disabled:opacity-40">🔁 Tersten Çal</button>
      <p className="text-xs text-surface-500 mt-2">5 saniyelik ters kesit — ne çaldığını bul</p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {opts.map((o) => (
          <button key={o.id} onClick={() => answer(o)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{o.title}</button>
        ))}
      </div>
    </div>
  )
}

/* 65 — Instrument Ear: synth tones, pick the instrument */
const INSTRUMENTS = [
  { name: 'Piyano', tone: 'triangle', freq: 440, decay: 2.5 },
  { name: 'Org', tone: 'sawtooth', freq: 330, decay: 1.5 },
  { name: 'Flüt', tone: 'sine', freq: 494, decay: 1.2 },
  { name: 'Bas', tone: 'square', freq: 110, decay: 0.9 },
  { name: 'Ksilofon', tone: 'triangle', freq: 880, decay: 0.4 },
  { name: 'Synthesizer', tone: 'sawtooth', freq: 523, decay: 2.0 },
]
function EarGame() {
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [target, setTarget] = useState<typeof INSTRUMENTS[number] | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const correctRef = useRef(0)

  function newRound() {
    const t = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)]
    setTarget(t); correctRef.current = t.name === 'Piyano' ? 0 : INSTRUMENTS.findIndex((x) => x.name === t.name)
  }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  function play() {
    if (!target) return
    const ctx = ctxRef.current || new AudioContext()
    ctxRef.current = ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = target.tone as OscillatorType
    osc.frequency.value = target.freq
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + target.decay)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + target.decay + 0.1)
  }
  function answer(i: number) {
    if (INSTRUMENTS[i].name === target?.name) { setScore((s) => s + 10); setStreak((s) => s + 1) } else setStreak(0)
    setTimeout(newRound, 600)
  }

  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={streak} />
      <button onClick={play} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20">🎹 Sesi Çal</button>
      <p className="text-xs text-surface-500 mt-2">Çalan enstrüman hangisi?</p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {INSTRUMENTS.map((ins, i) => (
          <button key={ins.name} onClick={() => answer(i)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{ins.name}</button>
        ))}
      </div>
    </div>
  )
}

/* 68 — Emoji Puzzle */
const EMOJI_MAP: Record<string, string> = { a: '🍎', e: '👁️', i: '✳️', o: '⭕', u: '🪀', b: '🐝', c: '🐈', d: '🦌', f: '🪶', g: '🎸', h: '🏠', k: '🔑', l: '🎵', m: '🎤', n: '🌙', p: '🍕', r: '🌈', s: '⭐', t: '🌵', y: '🍤', z: '⚡', ç: '🌶️', ğ: '🌍', ı: '🪨', ö: '🥚', ş: '🐍', ü: '🍇' }
function emojify(title: string): string {
  return title.toLowerCase().split('').map((c) => EMOJI_MAP[c] || '▢').join(' ').slice(0, 60)
}
function EmojiGame({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [opts, setOpts] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [score, setScore] = useState(0)
  function newRound() {
    const p = pick4(); if (p.length < 4) return
    setOpts(p); setCorrect(p[Math.floor(Math.random() * p.length)])
  }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  function answer(s: Song) {
    if (s.id === correct?.id) { setScore((x) => x + 10); confettiBurst() }
    setTimeout(newRound, 700)
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <div className="text-3xl leading-relaxed font-mono text-wave-300 mb-6 min-h-24 px-6 py-4 bg-surface-950/60 border border-surface-800 rounded-2xl">{correct ? emojify(correct.title) : '...'}</div>
      <p className="text-xs text-surface-500 mb-4">Emoji şifresini çöz — hangi şarkı?</p>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {opts.map((o) => (
          <button key={o.id} onClick={() => answer(o)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{o.title}</button>
        ))}
      </div>
    </div>
  )
}

/* 71 — Music Wordle */
const WORDLE_WORDS = ['REVERB', 'MELODI', 'NAKARAT', 'GITAR', 'VOKAL', 'BASGITAR', 'DAVUL', 'PIYANO', 'SOZLER', 'ALBUM', 'LISTE', 'RIYTM', 'TURKU', 'ENSTRUMAN', 'RADYO', 'KULAKLIK']
function WordleGame() {
  const [word, setWord] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [done, setDone] = useState(false)
  function newGame() {
    setWord(WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)])
    setGuesses([]); setInput(''); setDone(false)
  }
  useEffect(() => { newGame(); /* eslint-disable-line */ }, [])
  function submit() {
    const g = input.trim().toUpperCase()
    if (g.length !== word.length || !g) return
    const next = [...guesses, g]
    setGuesses(next); setInput('')
    if (g === word) { setDone(true); emitToast('🎉 Kelimeyi buldun!', 'success'); confettiBurst() }
    else if (next.length >= 6) { setDone(true); emitToast(`Cevap: ${word}`, 'info') }
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <p className="text-xs text-surface-400 mb-4">Müzik kelimesini {word.length} harfli, 6 tahminde bul</p>
      <div className="flex flex-col gap-1.5 max-w-xs mx-auto mb-5">
        {guesses.map((g, gi) => (
          <div key={gi} className="flex justify-center gap-1.5">
            {g.split('').map((ch, i) => {
              const exact = ch === word[i]
              const inWord = word.includes(ch)
              return <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${exact ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' : inWord ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-surface-800 text-surface-500 border-surface-700'} border`}>{ch}</div>
            })}
          </div>
        ))}
        {!done && guesses.length < 6 && (
          <div className="flex justify-center gap-1.5 mt-2">
            <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && submit()} maxLength={word.length} placeholder={'_'.repeat(word.length)} className="w-32 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white tracking-widest text-center placeholder:text-surface-600 focus:outline-none focus:border-wave-500/50" />
            <button onClick={submit} className="px-3 rounded-lg bg-wave-500 text-white text-sm font-semibold">Dene</button>
          </div>
        )}
      </div>
      <button onClick={newGame} className="text-xs text-wave-400 hover:text-wave-300">Yeni Kelime</button>
    </div>
  )
}

/* 72 — Intro/Outro Hunter */
function EdgeGame({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [opts, setOpts] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [mode, setMode] = useState<'intro' | 'outro'>('intro')
  const [score, setScore] = useState(0)
  const [playing, setPlaying] = useState(false)
  function newRound() {
    const p = pick4(); if (p.length < 4) return
    setOpts(p); setCorrect(p[Math.floor(Math.random() * p.length)])
    setMode(Math.random() > 0.5 ? 'intro' : 'outro'); setPlaying(false)
  }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  function play() {
    if (!correct?.audio_url) return
    stopArcadeAudio()
    const audio = new Audio()
    arcadeAudio = audio
    resolveAudioUrl(correct.audio_url).then((u) => {
      if (arcadeAudio !== audio) return
      audio.src = u
      if (mode === 'intro') { audio.currentTime = 0; audio.play().catch(() => {}) }
      else { audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.max(0, audio.duration - 1); audio.play().catch(() => {}) }) }
    })
    setTimeout(() => { try { audio.pause() } catch {} }, 3000)
    setPlaying(true)
  }
  function answer(s: Song) {
    if (s.id === correct?.id) { setScore((x) => x + 10); emitToast(mode === 'intro' ? '🎬 Girişten tanıdın!' : '🏁 Outrodan yakaladın!', 'success') }
    stopArcadeAudio(); setTimeout(newRound, 800)
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <p className="text-xs font-bold text-wave-400 mb-4 uppercase tracking-wider">{mode === 'intro' ? '🎬 İlk 1 saniye' : '🏁 Son 1 saniye'}</p>
      <button onClick={play} disabled={playing} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 text-white font-bold shadow-lg shadow-pink-500/20 disabled:opacity-40">▶ Kesiti Çal</button>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {opts.map((o) => (
          <button key={o.id} onClick={() => answer(o)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{o.title}</button>
        ))}
      </div>
    </div>
  )
}

/* 146 — Hearing Age Test */
function HearingTest() {
  const [level, setLevel] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const playingRef = useRef<HTMLAudioElement | null>(null)
  const steps = [16000, 14000, 12000, 10000, 8000]
  function play() {
    if (result !== null) return
    const ctx = ctxRef.current || new AudioContext()
    ctxRef.current = ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = steps[level]
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 1.7)
  }
  function yes() {
    if (level >= steps.length - 1) setResult(20)
    else setLevel((l) => l + 1)
  }
  function no() { setResult(level === 0 ? 50 : 30 + (level - 1) * 10) }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      {result === null ? (
        <>
          <p className="text-sm text-surface-300 mb-2">Tonu duyuyor musun?</p>
          <p className="text-xs text-wave-400 mb-5 font-mono">{steps[level]} Hz</p>
          <div className="flex justify-center gap-3 mb-4">
            <button onClick={play} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-wave-500/20">▶ Tonu Çal</button>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={yes} className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold">👂 Duyuyorum</button>
            <button onClick={no} className="px-5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 text-sm font-semibold">🙉 Duymuyorum</button>
          </div>
          <p className="text-xs text-surface-500 mt-4">Kulaklıkla dene — yüksek ses zararlıdır, orta seviyede tut</p>
        </>
      ) : (
        <div className="py-6">
          <p className="text-5xl mb-3">{result <= 20 ? '🦅' : result <= 30 ? '🐬' : result <= 40 ? '🐘' : '🦉'}</p>
          <p className="text-2xl font-display font-bold text-white mb-2">Kulak yaşın: {result}</p>
          <p className="text-sm text-surface-400 mb-6">{result <= 20 ? 'Mükemmel işitme — genç kulaklar!' : result <= 30 ? 'Oldukça iyi — ama biraz yaşlıyız 😄' : result <= 40 ? 'Normal — çoğu yetişkin bu seviyede' : 'Yaşlı ama bilge kulaklar 🦉'}</p>
          <button onClick={() => { setResult(null); setLevel(0) }} className="px-5 py-2.5 rounded-xl bg-wave-500 text-white text-sm font-semibold">Tekrar Dene</button>
        </div>
      )}
    </div>
  )
}

/* 191 — Offline Dino (flappy-ish jump) */
function DinoGame() {
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [y, setY] = useState(0)
  const [obs, setObs] = useState<{ x: number; h: number }[]>([])
  const raf = useRef(0)
  const vy = useRef(0)
  const dead = useRef(false)
  const speed = useRef(260)
  useEffect(() => {
    if (!running) return
    const tick = (dt: number) => {
      vy.current -= 900 * dt
      setY((p) => {
        const ny = Math.max(0, p + vy.current * dt)
        if (ny === 0) vy.current = 0
        return ny
      })
      setObs((o) => {
        let list = o.map((x) => ({ ...x, x: x.x - speed.current * dt })).filter((x) => x.x > -40)
        if (Math.random() < dt * 0.9) list = [...list, { x: 480, h: 40 + Math.random() * 90 }]
        return list
      })
    }
    let last = performance.now()
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); raf.current = requestAnimationFrame(loop) }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [running])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const ground = 60
      setY((yy) => {
        const playerBottom = 120 - yy
        const hit = obs.some((o) => o.x < 70 && o.x > 15 && playerBottom < ground + o.h)
        if (hit && !dead.current) { dead.current = true; stopDino() }
        return yy
      })
    }, 80)
    return () => clearInterval(id)
  }, [running, obs])
  function stopDino() {
    setRunning(false)
    emitToast(`🏁 Skor: ${score} — yeni deneme!`, 'info')
  }
  function jump() {
    if (vy.current === 0) vy.current = 420
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!running) { dead.current = false; setScore(0); setObs([]); setY(0); vy.current = 0; setRunning(true) } else jump() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running])
  useEffect(() => {
    if (running) {
      const id = setInterval(() => setScore((s) => s + 1), 200)
      return () => clearInterval(id)
    }
  }, [running])
  useEffect(() => { if (score > 0 && score % 100 === 0) saveArcadeScore('dino', score) }, [score])

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">🦖 Müzik Dino</p>
        <p className="text-sm font-bold text-wave-400">Skor: {score}</p>
      </div>
      <div className="relative h-52 bg-surface-950/60 border border-surface-800 rounded-2xl overflow-hidden">
        <div className="absolute bottom-14 left-0 right-0 h-1 bg-surface-700" />
        <div className="absolute bottom-14 left-4 w-8 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-t-md transition-all" style={{ transform: `translateY(${-y}px)` }}>
          <div className="absolute -top-2 left-2 w-2 h-2 bg-emerald-300 rounded-full" />
        </div>
        {obs.map((o, i) => (
          <div key={i} className="absolute bottom-14 w-7 bg-gradient-to-t from-fuchsia-600 to-purple-500 rounded-t-md" style={{ left: o.x, height: o.h }} />
        ))}
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button onClick={() => { dead.current = false; setScore(0); setObs([]); setY(0); vy.current = 0; setRunning(true) }} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white font-bold shadow-lg">Başla (Boşluk = Zıpla)</button>
          </div>
        )}
      </div>
      <p className="text-xs text-surface-500 mt-3 text-center">İnternetsiz de çalışır — engellere çarpma</p>
    </div>
  )
}

/* ---------- Paket 2 oyunları (v8.1.0) ---------- */

function currentSeason(): string {
  const m = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  const d = new Date()
  return `${m[d.getMonth()]} ${d.getFullYear()}`
}
function saveArcadeScore(game: string, score: number) {
  if (score < 10) return
  try {
    const key = 'waveify_arcade_season'
    const data = JSON.parse(localStorage.getItem(key) || 'null') || { season: currentSeason(), scores: [] }
    const name = useStore.getState().user?.username || 'Misafir'
    data.scores.push({ name, score, game, date: Date.now() })
    if (data.scores.length > 300) data.scores.splice(0, data.scores.length - 300)
    localStorage.setItem(key, JSON.stringify(data))
    const bestKey = 'waveify_arcade_best'
    const bests = JSON.parse(localStorage.getItem(bestKey) || '{}')
    if (!bests[game] || bests[game] < score) { bests[game] = score; localStorage.setItem(bestKey, JSON.stringify(bests)) }
  } catch { /* boş */ }
}

/* 55 — Melodi Taklit (Simon) */
const SIMON_NOTES = [261.63, 329.63, 392.0, 493.88]
const SIMON_STYLE = ['bg-emerald-500 shadow-emerald-500/40', 'bg-rose-500 shadow-rose-500/40', 'bg-amber-500 shadow-amber-500/40', 'bg-sky-500 shadow-sky-500/40']
function SimonGame() {
  const [seq, setSeq] = useState<number[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [active, setActive] = useState(-1)
  const ctxRef = useRef<AudioContext | null>(null)
  const timers = useRef<number[]>([])

  function tone(i: number, dur = 0.35) {
    const ctx = ctxRef.current || new AudioContext()
    ctxRef.current = ctx
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = 'triangle'; osc.frequency.value = SIMON_NOTES[i]
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.45, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur + 0.05)
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  function playSeq(s: number[]) {
    setPhase('show'); setActive(-1)
    timers.current = s.map((n, i) => window.setTimeout(() => { setActive(n); tone(n); window.setTimeout(() => setActive(-1), 240) }, i * 560))
    timers.current.push(window.setTimeout(() => { setIdx(0); setPhase('input') }, s.length * 560 + 300))
  }
  function start() {
    setScore(0)
    const first = Math.floor(Math.random() * 4)
    setSeq([first]); playSeq([first])
  }
  function press(i: number) {
    if (phase !== 'input') return
    tone(i)
    if (i !== seq[idx]) { setPhase('over'); emitToast(`Bellek bitti — skor ${score}`, 'info'); if (score > 0) saveArcadeScore('simon', score) }
    else {
      const ni = idx + 1
      if (ni >= seq.length) {
        const ns = [...seq, Math.floor(Math.random() * 4)]
        setSeq(ns); setScore((s) => s + 1)
        window.setTimeout(() => playSeq(ns), 500)
      } else setIdx(ni)
    }
  }
  useEffect(() => { if (score > 0 && score % 50 === 0) saveArcadeScore('simon', score) }, [score])

  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={phase === 'input' ? 0 : 0} />
      <p className="text-xs text-surface-400 mb-4">{phase === 'show' ? '👀 Sırayı izle...' : phase === 'input' ? '🎯 Sırayı tekrarla!' : phase === 'over' ? '😵 Devam edemedin' : 'Nota sırasını takip et ve tekrarla'}</p>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-5">
        {SIMON_STYLE.map((cls, i) => (
          <button key={i} onClick={() => press(i)} className={`h-24 rounded-2xl ${cls} ${active === i ? 'scale-95 brightness-150' : ''} ${phase === 'over' ? 'opacity-40' : ''} transition-all shadow-lg`} />
        ))}
      </div>
      {phase === 'idle' || phase === 'over' ? (
        <button onClick={start} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-wave-500/20">{phase === 'over' ? 'Tekrar Dene' : 'Başla'}</button>
      ) : (
        <p className="text-2xl font-display font-bold text-wave-400">{seq.length} nota</p>
      )}
    </div>
  )
}

/* 58 — Şarkı Blokları (hafıza eşleştirme) */
function SongBlocks({ songs }: { songs: Song[] }) {
  const [tiles, setTiles] = useState<{ songId: string; open: boolean; gone: boolean }[]>([])
  const [pairs, setPairs] = useState<Song[]>([])
  const [picks, setPicks] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  function start() {
    const s = [...songs].sort(() => Math.random() - 0.5).slice(0, 6)
    setPairs(s)
    const t = [...s, ...s].sort(() => Math.random() - 0.5).map((x) => ({ songId: x.id, open: false, gone: false }))
    setTiles(t); setPicks([]); setMoves(0); setWon(false)
  }
  useEffect(() => { start(); /* eslint-disable-line */ }, [])
  function flip(i: number) {
    if (tiles[i].open || tiles[i].gone || picks.length === 2 || won) return
    const nt = [...tiles]; nt[i] = { ...nt[i], open: true }
    const np = [...picks, i]
    setTiles(nt); setPicks(np)
    if (np.length === 2) {
      setMoves((m) => m + 1)
      if (nt[np[0]].songId === nt[np[1]].songId) {
        window.setTimeout(() => {
          setTiles((tt) => tt.map((x, j) => np.includes(j) ? { ...x, gone: true, open: false } : x))
          setPicks([])
          setWon((w) => { const complete = nt.every((x, j) => np.includes(j) || x.gone); if (complete) { confettiBurst(); emitToast('🎉 Blokları temizledin!', 'success'); saveArcadeScore('blocks', Math.max(10, 100 - moves * 5)) } return w || complete })
        }, 450)
      } else {
        window.setTimeout(() => { setTiles((tt) => tt.map((x, j) => np.includes(j) ? { ...x, open: false } : x)); setPicks([]) }, 850)
      }
    }
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <div className="flex items-center justify-between mb-4">
        <div className="px-3 py-1.5 rounded-xl bg-surface-800/70 border border-surface-700 text-sm font-bold text-white">Hamle: {moves}</div>
        <p className="text-xs text-surface-400">Eş blokları bul — 12 blok / 6 eş</p>
      </div>
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto mb-5">
        {tiles.map((t, i) => {
          const song = pairs.find((p) => p.id === t.songId)
          return (
            <button key={i} onClick={() => flip(i)} className={`h-16 rounded-xl border transition-all ${t.gone ? 'opacity-0 pointer-events-none' : t.open ? 'bg-wave-500/15 border-wave-500/50' : 'bg-gradient-to-br from-wave-500 to-fuchsia-500 border-surface-700 hover:scale-105'} flex items-center justify-center overflow-hidden`}>
              {t.open ? <span className="text-[10px] leading-tight text-white px-1 font-medium">{song?.title}</span> : <span className="text-white/80 text-lg">🎵</span>}
            </button>
          )
        })}
      </div>
      <button onClick={start} className="text-xs text-wave-400 hover:text-wave-300">Karıştır ve Yeni Oyun</button>
    </div>
  )
}

/* 61 — Flappy Note (mikrofon sesiyle zıplama) */
function FlappyNote() {
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [y, setY] = useState(0)
  const [obs, setObs] = useState<{ x: number; gapY: number }[]>([])
  const [micOn, setMicOn] = useState(false)
  const raf = useRef(0)
  const vy = useRef(0)
  const dead = useRef(false)
  const micLevel = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const speed = useRef(170)

  function startMic() {
    if (!navigator.mediaDevices?.getUserMedia) return
    navigator.mediaDevices.getUserMedia({ audio: true }).then((st) => {
      streamRef.current = st
      setMicOn(true)
      try {
        const ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(st)
        const an = ctx.createAnalyser(); an.fftSize = 512
        src.connect(an)
        const buf = new Uint8Array(an.fftSize)
        const loop = () => { an.getByteTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v } micLevel.current = Math.sqrt(sum / buf.length); requestAnimationFrame(loop) }
        loop()
      } catch { micLevel.current = 0 }
    }).catch(() => { micLevel.current = 0 })
  }
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  useEffect(() => {
    if (!running) return
    const tick = (dt: number) => {
      vy.current -= 880 * dt
      setY((p) => {
        const ny = Math.max(0, p + vy.current * dt)
        if (ny === 0) vy.current = 0
        return ny
      })
      if (micOn && micLevel.current > 0.09 && vy.current <= 0) vy.current = 340
      setObs((o) => {
        let list = o.map((x) => ({ ...x, x: x.x - speed.current * dt })).filter((x) => x.x > -50)
        if (Math.random() < dt * 0.55) list = [...list, { x: 480, gapY: 90 + Math.random() * 140 }]
        return list
      })
    }
    let last = performance.now()
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); raf.current = requestAnimationFrame(loop) }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [running, micOn])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setY((yy) => {
        const birdY = 120 - yy
        const hit = obs.some((o) => o.x < 80 && o.x > 55 && (birdY < o.gapY - 58 || birdY > o.gapY + 58))
        if ((hit || yy === 0) && !dead.current && yy === 0) { dead.current = true; setRunning(false); emitToast(`🏁 Skor: ${score}`, 'info'); if (score > 0) saveArcadeScore('flappy', score) }
        if (hit && !dead.current) { dead.current = true; setRunning(false); emitToast(`🏁 Skor: ${score}`, 'info'); if (score > 0) saveArcadeScore('flappy', score) }
        return yy
      })
    }, 60)
    return () => clearInterval(id)
  }, [running, obs, score])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (!running) { dead.current = false; setScore(0); setObs([]); setY(0); vy.current = 0; setRunning(true); if (!micOn) startMic() }
        else if (vy.current <= 0) vy.current = 340
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running, micOn])

  useEffect(() => {
    if (running) {
      const id = setInterval(() => setScore((s) => s + 1), 200)
      return () => clearInterval(id)
    }
  }, [running])

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">🎵 Flappy Note</p>
        <div className="flex items-center gap-3">
          {micOn && <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">🎤 Mikrofon açık</span>}
          <p className="text-sm font-bold text-wave-400">Skor: {score}</p>
        </div>
      </div>
      <div className="relative h-52 bg-surface-950/60 border border-surface-800 rounded-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 bottom-0 opacity-20" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(20,184,166,.15) 18px, rgba(20,184,166,.15) 19px)' }} />
        <div className="absolute bottom-6 left-4 w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full transition-all shadow-lg shadow-amber-500/40" style={{ transform: `translateY(${-y}px)` }}>🎵</div>
        {obs.map((o, i) => (
          <div key={i}>
            <div className="absolute top-0 w-10 bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-b-lg" style={{ left: o.x, height: o.gapY - 58 }} />
            <div className="absolute bottom-6 w-10 bg-gradient-to-b from-emerald-700 to-emerald-600 rounded-t-lg" style={{ left: o.x, height: 208 - (o.gapY + 58) }} />
          </div>
        ))}
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <button onClick={() => { dead.current = false; setScore(0); setObs([]); setY(0); vy.current = 0; setRunning(true); if (!micOn) startMic() }} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white font-bold shadow-lg mb-2">Başla</button>
              <p className="text-xs text-surface-400">🎤 Mikrofon kapatıp seslenerek (veya Boşluk) zıpla</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-surface-500 mt-3 text-center">Seslendikçe nota yükselir — borulara çarpma</p>
    </div>
  )
}

/* 64 — Kaçış Odası: 4 bilmece */
function EscapeRoom({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [step, setStep] = useState(0)
  const [opts, setOpts] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [correct, setCorrect] = useState('')
  const [wrong, setWrong] = useState(false)
  const [won, setWon] = useState(false)
  const [busy, setBusy] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const rounds = useRef(0)

  async function playReverse(p: Song[]) {
    const s = p[Math.floor(Math.random() * p.length)]
    setCorrect(s.title)
    if (!s.audio_url) return
    setBusy(true)
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      const res = await fetch(s.audio_url)
      const buf = await ctx.decodeAudioData(await res.arrayBuffer())
      const rev = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate)
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = rev.getChannelData(ch), o = buf.getChannelData(ch)
        for (let i = 0; i < buf.length; i++) d[i] = o[buf.length - 1 - i]
      }
      const src = ctx.createBufferSource()
      src.buffer = rev
      const g = ctx.createGain(); g.gain.value = 0.8
      src.connect(g); g.connect(ctx.destination)
      srcRef.current = src
      src.start(ctx.currentTime, 0, 4)
      window.setTimeout(() => { try { src.stop() } catch {} }, 4200)
    } catch { emitToast('Ses çözülemedi', 'error') }
    setBusy(false)
  }
  function build() {
    const p = pick4(); if (p.length < 4) return
    const s = p[Math.floor(Math.random() * p.length)]
    setWrong(false)
    if (step === 0) {
      setQuestion(`"${s.title}" şarkısını kim seslendiriyor?`)
      setCorrect(s.artist || '')
      setOpts([...new Set(p.map((x) => x.artist || '?'))].sort(() => Math.random() - 0.5))
    } else if (step === 1) {
      const longest = p.reduce((a, b) => (b.title.length > a.title.length ? b : a))
      setQuestion('Gözlerin karanlığa alıştı — hangi şarkının başlığı en uzun?')
      setCorrect(longest.title)
      setOpts(p.map((x) => x.title).sort(() => Math.random() - 0.5))
    } else if (step === 2) {
      setQuestion(`Duvar yazısı bir şifre: ${emojify(s.title)}`)
      setCorrect(s.title)
      setOpts(p.map((x) => x.title).sort(() => Math.random() - 0.5))
    } else {
      setQuestion('Son kilit: tersten çalan kesiti çöz!')
      setOpts([])
      rounds.current = 0
      window.setTimeout(() => playReverse(p), 300)
    }
  }
  useEffect(() => { build(); /* eslint-disable-line */ }, [step])
  function answer(a: string) {
    if (a === correct) {
      if (step >= 3) { setWon(true); confettiBurst(); emitToast('🔓 Kapı açıldı! Kaçış başarılı!', 'success'); saveArcadeScore('escape', 50) }
      else setStep((s) => s + 1)
    } else { setWrong(true); emitToast('❌ Kilidi açmadı', 'error') }
  }
  function retryReverse() {
    if (!busy) build()
  }
  if (won) {
    return (
      <div className="glass rounded-2xl p-5 text-center py-10">
        <p className="text-6xl mb-4">🔓</p>
        <p className="text-2xl font-display font-bold text-white mb-2">Kaçış Başarılı!</p>
        <p className="text-sm text-surface-400 mb-6">4 bilmecenin hepsini çözdün, stüdyodan çıktın 🎉</p>
        <button onClick={() => { setWon(false); setStep(0) }} className="px-5 py-2.5 rounded-xl bg-wave-500 text-white text-sm font-semibold">Tekrar Oyna</button>
      </div>
    )
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <div className="flex justify-center gap-1.5 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 w-10 rounded-full transition-colors ${i < step ? 'bg-emerald-500' : i === step ? 'bg-wave-400' : 'bg-surface-700'}`} />
        ))}
      </div>
      <p className="text-xs text-surface-400 mb-2 uppercase tracking-wider">Bilmece {step + 1} / 4</p>
      <p className="text-lg font-semibold text-white mb-1 leading-snug">{question}</p>
      {step === 3 && (
        <div className="mb-4">
          <button onClick={retryReverse} disabled={busy} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-40">🔁 Kesiti Çal</button>
          <p className="text-xs text-surface-500 mt-2">4 saniyelik ters kesit — dinle ve tahmin et</p>
        </div>
      )}
      {wrong && <p className="text-xs text-rose-400 mb-3">Yanlış — tekrar dene!</p>}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {opts.map((o) => (
          <button key={o} onClick={() => answer(o)} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white hover:border-wave-500/50 transition-all">{o}</button>
        ))}
      </div>
      <p className="text-xs text-surface-500 mt-4">Müzik bilginle stüdyodan kaç! 🚪</p>
    </div>
  )
}

/* 66 — Wave Tamagotçi */
const TAMA_KEY = 'waveify_tamagotchi'
type Tama = { name: string; hunger: number; mood: number; energy: number; lastSeen: number; plays: number }
function Tamagotchi() {
  const [tama, setTama] = useState<Tama>(() => {
    try {
      const t = JSON.parse(localStorage.getItem(TAMA_KEY) || '')
      if (t) {
        const hours = Math.max(0, (Date.now() - t.lastSeen) / 3600000)
        return { ...t, hunger: Math.max(0, t.hunger - hours * 2), mood: Math.max(0, t.mood - hours * 1.5), energy: Math.max(0, t.energy - hours * 1.5) }
      }
    } catch { /* boş */ }
    return { name: 'Bebe', hunger: 80, mood: 80, energy: 80, lastSeen: Date.now(), plays: 0 }
  })
  useEffect(() => { localStorage.setItem(TAMA_KEY, JSON.stringify({ ...tama, lastSeen: Date.now() })) }, [tama])
  function act(kind: 'eat' | 'play' | 'sleep') {
    setTama((t) => {
      const nt = { ...t, plays: t.plays + 1 }
      if (kind === 'eat') nt.hunger = Math.min(100, t.hunger + 25)
      if (kind === 'play') { nt.mood = Math.min(100, t.mood + 20); nt.energy = Math.max(0, t.energy - 10) }
      if (kind === 'sleep') nt.energy = Math.min(100, t.energy + 40)
      return nt
    })
  }
  const sick = tama.hunger < 20 || tama.mood < 20
  const face = sick ? '🤒' : tama.energy < 20 ? '😴' : tama.mood > 70 && tama.hunger > 70 ? '😎' : '😊'
  function Bar({ label, val, color }: { label: string; val: number; color: string }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-surface-400 w-12 text-left">{label}</span>
        <div className="flex-1 h-2.5 bg-surface-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${val}%` }} />
        </div>
        <span className="text-xs font-bold text-white w-8 text-right">{Math.round(val)}</span>
      </div>
    )
  }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <input value={tama.name} onChange={(e) => setTama((t) => ({ ...t, name: e.target.value }))} className="bg-transparent text-center text-xl font-display font-bold text-white border-b border-surface-700 focus:outline-none focus:border-wave-500/50 w-40" />
      </div>
      <div className={`w-28 h-28 rounded-full mx-auto mb-4 flex items-center justify-center text-6xl border-2 ${sick ? 'border-rose-500/50 bg-rose-500/10' : 'border-wave-500/30 bg-wave-500/10'} shadow-xl shadow-wave-500/10 transition-all`}>{face}</div>
      <div className="max-w-xs mx-auto flex flex-col gap-2 mb-5">
        <Bar label="Açlık" val={tama.hunger} color="bg-amber-400" />
        <Bar label="Neşe" val={tama.mood} color="bg-fuchsia-400" />
        <Bar label="Enerji" val={tama.energy} color="bg-sky-400" />
      </div>
      <div className="flex justify-center gap-2 flex-wrap">
        <button onClick={() => act('eat')} className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold">🍕 Yemek</button>
        <button onClick={() => act('play')} className="px-4 py-2 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300 text-sm font-semibold">🎮 Oyun</button>
        <button onClick={() => act('sleep')} className="px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 text-sm font-semibold">😴 Uyku</button>
      </div>
      <p className="text-xs text-surface-500 mt-4">Evcilin zamanla acıkır — onu ihmal etme! (Oyuncak: {tama.plays})</p>
    </div>
  )
}

/* 69 — A-B İşitme Testi */
function ABTest({ songs, pick4 }: { songs: Song[]; pick4: () => Song[] }) {
  const [correct, setCorrect] = useState<Song | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  function newRound() { const p = pick4(); if (p.length < 4) return; setCorrect(p[0]) }
  useEffect(() => { newRound(); /* eslint-disable-line */ }, [])
  useEffect(() => () => { try { srcRef.current?.stop() } catch { /* boş */ } }, [])
  async function play(quality: 'lossless' | 'mp3') {
    if (!correct?.audio_url || busy) return
    setBusy(true)
    try { srcRef.current?.stop() } catch { /* boş */ }
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      const res = await fetch(correct.audio_url)
      const buf = await ctx.decodeAudioData(await res.arrayBuffer())
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      if (quality === 'lossless') {
        src.connect(ctx.destination)
      } else {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400
        const g = ctx.createGain(); g.gain.value = 0.7
        src.connect(lp); lp.connect(g); g.connect(ctx.destination)
      }
      srcRef.current = src
      src.start(ctx.currentTime, 0, 4)
      window.setTimeout(() => { try { src.stop() } catch { /* boş */ } }, 4500)
    } catch { emitToast('Ses çözülemedi', 'error') }
    setBusy(false)
  }
  function answer(which: 'A' | 'B') {
    try { srcRef.current?.stop() } catch { /* boş */ }
    if (which === 'A') { setScore((s) => s + 10); emitToast('🎧 Altın kulak!', 'success') } else emitToast('❌ Aslında A kayıpsızdı', 'error')
    setTotal((t) => t + 1)
    window.setTimeout(newRound, 700)
  }
  useEffect(() => { if (score > 0 && score % 50 === 0) saveArcadeScore('abtest', score) }, [score])
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <p className="text-xs text-surface-400 mb-1">Tur: {total + 1} — şarkı: <b className="text-white">{correct?.title || '...'}</b></p>
      <p className="text-xs text-surface-500 mb-5">A kayıpsız (CD) kalitesinde, B sıkıştırılmış. Hangisini seçerdin? Önce ikisini de çal, sonra karar ver.</p>
      <div className="flex justify-center gap-3 mb-5">
        <button onClick={() => play('lossless')} disabled={busy} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-40">🎧 A — Çal</button>
        <button onClick={() => play('mp3')} disabled={busy} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/20 disabled:opacity-40">💾 B — Çal</button>
      </div>
      <div className="flex justify-center gap-3">
        <button onClick={() => answer('A')} className="px-5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-semibold">A daha iyiydi</button>
        <button onClick={() => answer('B')} className="px-5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 text-sm font-semibold">B daha iyiydi</button>
      </div>
      <p className="text-xs text-surface-500 mt-4">Kulaklık önerilir — 10 doğru = altın plak 🏅</p>
    </div>
  )
}

/* 73 — Dans Pisti (4 ok) */
const ARROW_LABELS = ['⬆', '⬇', '⬅', '➡']
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
function DanceFloor() {
  const [bpm, setBpm] = useState(120)
  const [running, setRunning] = useState(false)
  const [notes, setNotes] = useState<{ lane: number; y: number; hit: boolean }[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const raf = useRef(0)
  const lastSpawn = useRef(0)
  const lastHit = useRef(0)
  useEffect(() => {
    if (!running) return
    let start = performance.now()
    const tick = (now: number) => {
      const dt = now - start; start = now
      if (now - lastSpawn.current >= (60000 / bpm)) {
        lastSpawn.current = now
        setNotes((n) => [...n, { lane: Math.floor(Math.random() * 4), y: 0, hit: false }])
      }
      setNotes((n) => n.map((x) => ({ ...x, y: x.y + (dt / 1000) * 140 })).filter((x) => !x.hit && x.y < 520))
      raf.current = requestAnimationFrame(tick)
    }
    lastSpawn.current = performance.now()
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [running, bpm])
  function hit(lane: number) {
    if (!running) return
    const now = performance.now()
    if (now - lastHit.current < 100) return
    lastHit.current = now
    setNotes((n) => {
      const idx = n.findIndex((x) => x.lane === lane && !x.hit && x.y > 250 && x.y < 410)
      if (idx >= 0) {
        const copy = [...n]; copy[idx] = { ...copy[idx], hit: true }
        setScore((s) => s + 10); setStreak((s) => s + 1)
        if ((streak + 1) % 10 === 0) emitToast(`🔥 ${streak + 1} seri!`, 'success')
        return copy
      }
      setStreak(0)
      return n
    })
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const lane = ARROW_KEYS.indexOf(e.code)
      if (lane >= 0) { e.preventDefault(); hit(lane) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running])
  useEffect(() => { if (score > 0 && score % 100 === 0) saveArcadeScore('dance', score) }, [score])
  return (
    <div className="glass rounded-2xl p-5">
      <ScoreHeader score={score} streak={streak} />
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-surface-400">BPM</label>
        <input type="range" min={70} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 accent-wave-400" />
        <span className="text-sm text-white font-bold w-10 text-right">{bpm}</span>
        <button onClick={() => { if (!running) { setScore(0); setStreak(0); setNotes([]) } setRunning(!running) }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white text-sm font-semibold">{running ? 'Dur' : 'Başla'}</button>
      </div>
      <div className="relative h-64 bg-surface-950/60 border border-surface-800 rounded-2xl overflow-hidden">
        <div className="absolute top-[62%] left-0 right-0 h-0.5 bg-fuchsia-500/60 z-10" />
        <div className="absolute inset-x-0 top-0 bottom-0 flex">
          {[0, 1, 2, 3].map((l) => (
            <div key={l} className="flex-1 border-r border-surface-800/60 last:border-r-0 relative">
              {notes.filter((n) => n.lane === l).map((n, i) => (
                <div key={i} className="absolute left-1/2 -translate-x-1/2 w-12 h-10 rounded-lg bg-gradient-to-br from-fuchsia-400 to-purple-600 border border-fuchsia-300/30 flex items-center justify-center text-lg shadow-lg shadow-fuchsia-500/40" style={{ top: n.y - 20 }}>{ARROW_LABELS[l]}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-3 text-center">Ok çizgiye gelince <b className="text-white">↑ ↓ ← →</b> tuşlarıyla vur</p>
    </div>
  )
}

/* 74 — Plak Kazıma */
function ScratchVinyl() {
  const [score, setScore] = useState(0)
  const [spin, setSpin] = useState(0)
  const [scratching, setScratching] = useState(false)
  const [combos, setCombos] = useState(0)
  const lastX = useRef(0)
  const dir = useRef(0)
  const audioRef = useRef<{ ctx: AudioContext; buf: AudioBuffer } | null>(null)
  useEffect(() => {
    try {
      const ctx = new AudioContext()
      const len = ctx.sampleRate * 0.4
      const b = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = b.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      audioRef.current = { ctx, buf: b }
    } catch { /* boş */ }
    return () => { try { audioRef.current?.ctx.close() } catch { /* boş */ } }
  }, [])
  function onDown(e: React.PointerEvent) {
    lastX.current = e.clientX; dir.current = 0
    setScratching(true); setCombos(0)
    if (audioRef.current && audioRef.current.ctx.state === 'suspended') audioRef.current.ctx.resume()
  }
  function onMove(e: React.PointerEvent) {
    if (!scratching || !audioRef.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    const ndir = dx > 0 ? 1 : dx < 0 ? -1 : dir.current
    if (dx !== 0) {
      if (ndir !== dir.current) { dir.current = ndir; setCombos((c) => c + 1); setScore((s) => s + combos + 1); if (combos + 1 >= 10) emitToast(`🔥 ${combos + 1} kombo!`, 'success') }
      else setScore((s) => s + 1)
      setSpin((sp) => sp + dx * 0.8)
      const { ctx, buf } = audioRef.current
      const src = ctx.createBufferSource(); src.buffer = buf
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800
      const g = ctx.createGain(); g.gain.value = Math.min(0.45, Math.abs(dx) / 30)
      src.connect(hp); hp.connect(g); g.connect(ctx.destination)
      src.start(); src.stop(ctx.currentTime + 0.05)
      if (score > 0 && score % 100 === 0) saveArcadeScore('scratch', score)
    }
  }
  function onUp() { setScratching(false); setCombos(0) }
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <ScoreHeader score={score} streak={0} />
      <div className="flex items-center justify-center gap-4 mb-2">
        <div
          className="relative w-48 h-48 rounded-full select-none touch-none cursor-grab active:cursor-grabbing"
          style={{ background: 'radial-gradient(circle at 35% 35%, #1e293b, #0b1120 70%)', boxShadow: '0 10px 40px rgba(0,0,0,.5), inset 0 0 20px rgba(0,0,0,.8)', transform: `rotate(${spin}deg)`, transition: scratching ? 'none' : 'transform .4s ease' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'repeating-radial-gradient(circle, transparent 0 4px, rgba(20,184,166,.06) 4px 5px)' }} />
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-wave-900 to-surface-950 border border-wave-500/30 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wave-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-wave-500/30">
              <span className="text-xl">🎵</span>
            </div>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-wave-500/10" style={{ transform: `rotate(${spin * 0.5}deg)` }} />
        </div>
      </div>
      <p className="text-sm font-bold text-white mb-1">{scratching ? '🎧 Plak sürtülüyor!' : "DJ'in sırası sende"}</p>
      <p className="text-xs text-surface-500">Plakayı <b className="text-white">ileri geri</b> sürt — yön değiştirdikçe kombo puanı artar</p>
    </div>
  )
}

/* 75 — Liderlik Sezonu */
function SeasonBoard() {
  const [data, setData] = useState<{ season: string; scores: { name: string; score: number; game: string; date: number }[] }>(() => {
    try { return JSON.parse(localStorage.getItem('waveify_arcade_season') || '') || { season: currentSeason(), scores: [] } } catch { return { season: currentSeason(), scores: [] } }
  })
  const [bests, setBests] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('waveify_arcade_best') || '{}') } catch { return {} }
  })
  const sorted = [...data.scores].sort((a, b) => b.score - a.score).slice(0, 15)
  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`)
  const gameName = (id: string) => GAMES.find((g) => g.id === id)?.name || id
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-lg font-display font-bold text-white">🏆 {data.season} Sezonu</p>
          <p className="text-xs text-surface-500">Her ay sıfırlanır — oyunlarda 50+ puan skor kaydı yapar</p>
        </div>
        <button onClick={() => setData({ season: currentSeason(), scores: [] })} className="text-xs text-surface-400 hover:text-rose-400 transition-colors">Sıfırla</button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-center text-sm text-surface-500 py-8">Henüz skor yok — ilk skoru sen kaydet! 🎮</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-w-lg mx-auto">
          {sorted.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/40' : i < 3 ? 'bg-surface-800/60 border-surface-700' : 'bg-surface-900/40 border-surface-800'}`}>
              <span className="w-8 text-center text-lg">{medal(i)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                <p className="text-[10px] text-surface-500">{gameName(s.game)} · {new Date(s.date).toLocaleDateString('tr-TR')}</p>
              </div>
              <span className="text-sm font-bold text-wave-300">{s.score}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-surface-800">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Kişisel En İyiler</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(bests).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, s]) => (
            <div key={g} className="px-3 py-2 rounded-xl bg-surface-800/60 border border-surface-700">
              <p className="text-[10px] text-surface-500 truncate">{gameName(g)}</p>
              <p className="text-sm font-bold text-white">{s} <span className="text-[10px] text-surface-500 font-normal">puan</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
