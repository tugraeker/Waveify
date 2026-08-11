import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'
import { resolveAudioUrl } from '@/lib/offline'
import { trackTriviaPlay, awardXp } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'
import { confettiBurst } from '@/lib/party'
import { Headphones, ChevronRight, RotateCcw, Volume2, Sparkles, Music2, Trophy, Timer, Skull, History, Zap, AlertTriangle } from 'lucide-react'

interface Song {
  id: string
  title: string
  artist: string
  cover_url?: string
  audio_url?: string
  year?: number
}

const SNIPPET_SECONDS = 3
type Mode = 'klasik' | 'yillar' | 'zombi'

const DECADES = [
  { label: '60\'lar', min: 1960, max: 1969 },
  { label: '70\'ler', min: 1970, max: 1979 },
  { label: '80\'ler', min: 1980, max: 1989 },
  { label: '90\'lar', min: 1990, max: 1999 },
  { label: '2000\'ler', min: 2000, max: 2009 },
  { label: '2010\'lar', min: 2010, max: 2019 },
  { label: '2020\'ler', min: 2020, max: 2029 },
]

let snippetAudio: HTMLAudioElement | null = null

function stopSnippetAudio() {
  if (snippetAudio) {
    try { snippetAudio.pause() } catch {}
    try { snippetAudio.src = '' } catch {}
    snippetAudio = null
  }
}

export default function Trivia() {
  const [mode, setMode] = useState<Mode | null>(null)
  const [round, setRound] = useState(false)
  const [options, setOptions] = useState<Song[]>([])
  const [correct, setCorrect] = useState<Song | null>(null)
  const [phase, setPhase] = useState<'idle' | 'listening' | 'answered' | 'loading'>('idle')
  const [guess, setGuess] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [roundNo, setRoundNo] = useState(0)
  const [zombieSpeed, setZombieSpeed] = useState(1)
  const [loadError, setLoadError] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('waveify_trivia_best')
    if (raw) setBestStreak(Number(raw))
    return () => { stopSnippetAudio(); if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const stopSnippet = useCallback(() => {
    stopSnippetAudio()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  async function loadRound() {
    setPhase('loading')
    setLoadError('')
    stopSnippet()
    let data: any[] | null = null
    const stored = useStore.getState().songs
    if (stored.length >= 4) {
      data = stored
    } else {
      try {
        // NOTE: never select `year` — the live songs table has no such column and
        // PostgREST would fail the whole load (400), breaking trivia entirely.
        const res = await supabase.from('songs')
          .select('id,title,artist,cover_url,audio_url')
          .not('audio_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(400)
        data = res.data
        if (res.error) throw res.error
        if (data?.length) useStore.getState().setSongs(data)
      } catch (e: any) {
        console.error('[Trivia] catalog fetch failed:', e)
        setLoadError(`Şarkı kataloğu yüklenemedi: ${e?.message || 'bilinmeyen hata'}`)
        setPhase('idle')
        return
      }
    }
    if (!data || data.length < 4) {
      setLoadError(`Katalogda yeterli şarkı yok (en az 4 gerekiyor, bulunan: ${data?.length || 0}) — önce Yükle sayfasından şarkı ekle.`)
      setPhase('idle')
      return
    }
    const pool = [...data]
    const picked: Song[] = []
    while (picked.length < 4) {
      const i = Math.floor(Math.random() * pool.length)
      picked.push(pool.splice(i, 1)[0])
    }
    setOptions(picked)
    setCorrect(picked[Math.floor(Math.random() * picked.length)])
    setGuess(null)
    setRoundNo((n) => n + 1)
    setPhase('idle')
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setSecondsLeft(SNIPPET_SECONDS)
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          stopSnippetAudio()
          setPhase('answered')
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  function playSnippet() {
    if (!correct?.audio_url) return
    stopSnippet()
    const audio = new Audio()
    snippetAudio = audio
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    if (mode === 'zombi') audio.playbackRate = zombieSpeed
    resolveAudioUrl(correct.audio_url).then((url) => {
      if (snippetAudio !== audio) return
      audio.src = url
      audio.load()
    })
    // Media errors are visible, not silent
    audio.addEventListener('error', () => {
      if (snippetAudio !== audio) return
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('idle')
      setLoadError('Kesit oynatılamadı (media hatası) — yeni tur dene ya da şarkıyı yeniden yükle.')
    }, { once: true })
    audio.addEventListener('loadedmetadata', () => {
      if (!snippetAudio || snippetAudio !== audio) return
      const dur = audio.duration || 30
      const startFrom = Math.max(1, Math.min(dur - SNIPPET_SECONDS - 1, dur * (0.25 + Math.random() * 0.5)))
      try { audio.currentTime = startFrom } catch {}
      audio.play()
        .then(() => {
          if (!snippetAudio || snippetAudio !== audio) return
          setPhase('listening')
          startTimer()
        })
        .catch((e) => {
          console.warn('[Trivia] autoplay blocked:', e)
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('idle')
          setLoadError('Tarayıcı otomatik oynatmayı engelledi — "Çal" butonuna tekrar dokun.')
        })
    }, { once: true })
  }

  function answer(id: string) {
    if (phase !== 'answered') return
    stopSnippet()
    const ok = id === correct?.id
    if (ok) {
      const newStreak = streak + 1
      setStreak(newStreak)
      const gained = 10 + Math.min(newStreak * 2, 20)
      setScore((s) => s + gained)
      awardXp(3)
      trackTriviaPlay()
      confettiBurst()
      if (typeof navigator.vibrate === 'function') navigator.vibrate(40)
      if (newStreak > bestStreak) {
        setBestStreak(newStreak)
        localStorage.setItem('waveify_trivia_best', String(newStreak))
      }
      if (mode === 'zombi') setZombieSpeed((z) => Math.min(2, z + 0.25))
    } else {
      setStreak(0)
      trackTriviaPlay()
      if (mode === 'zombi') setZombieSpeed((z) => Math.max(0.5, z - 0.25))
      emitToast('Yanlış tahmin! Doğru cevap gösterildi.', 'error')
    }
    setPhase('answered')
    setGuess(id)
  }

  const answerLabel = (o: Song) => (mode === 'yillar' ? (DECADES.find((d) => o.year !== undefined && o.year! >= d.min && o.year! <= d.max)?.label || 'Belirsiz') : o.title)

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="relative z-10 flex flex-col h-full p-6 max-w-2xl w-full mx-auto overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-display font-bold text-gradient flex items-center gap-2">
            <Headphones size={26} /> Drop Modu
          </h1>
          <span className="text-xs text-surface-400 flex items-center gap-1.5">
            <Trophy size={13} className="text-amber-400" /> Rekor Seri: {bestStreak}
          </span>
        </div>
        <p className="text-sm text-surface-400 mb-6">3 saniyelik kesiti dinle, çalan şarkıyı tahmin et. Seri yaklaştıkça puan artar.</p>

        {loadError && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-fade-in">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => { setLoadError(''); if (mode) loadRound() }} className="text-red-200 underline hover:text-white flex-shrink-0">Tekrar dene</button>
          </div>
        )}

        {mode && mode !== 'klasik' && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMode('klasik')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-surface-700 text-surface-300 hover:text-white transition-colors"
            >
              Klasik
            </button>
            {(mode === 'zombi') && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-1.5">
                <Skull size={12} /> ZOMBİ {zombieSpeed.toFixed(2)}x
              </span>
            )}
            {(mode === 'yillar') && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
                <History size={12} /> YILLAR
              </span>
            )}
          </div>
        )}

        {!mode ? (
          <div className="grid gap-3">
            {([
              { key: 'klasik', label: 'Klasik', desc: 'Şarkıyı tahmin et', icon: Headphones, grad: 'from-wave-500/20 to-fuchsia-500/20' },
              { key: 'yillar', label: 'Yıllar', desc: 'Şarkının yılını tahmin et', icon: History, grad: 'from-cyan-500/20 to-blue-500/20' },
              { key: 'zombi', label: 'Zombi Modu', desc: 'Doğru = hızlanır, yanlış = yavaşlar', icon: Skull, grad: 'from-red-500/20 to-orange-500/20' },
            ] as { key: Mode; label: string; desc: string; icon: typeof Headphones; grad: string }[]).map((m) => {
              const Icon = m.icon
              return (
                <button key={m.key} onClick={() => { setMode(m.key); setRound(true); setZombieSpeed(1); loadRound() }}
                  className="flex items-center gap-4 p-5 glass rounded-2xl border border-surface-700/50 hover:border-wave-500/40 hover:scale-[1.01] transition-all duration-200 text-left group">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.grad} border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon size={26} className="text-white/90" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-display font-semibold text-white">{m.label}</p>
                    <p className="text-xs text-surface-400">{m.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-surface-500 group-hover:text-wave-400 transition-colors" />
                </button>
              )
            })}
            <p className="text-[11px] text-surface-500 text-center mt-1 flex items-center justify-center gap-1">
              <Zap size={11} className="text-wave-400" /> Ana müziğin asla durmaz — snippet ayrı kanaldan çalar
            </p>
          </div>
        ) : round && correct ? (
          <div className="glass rounded-2xl p-5 mb-5 border border-surface-700/50 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-surface-500 font-display font-semibold">
                {mode === 'zombi' ? '☠️ Zombi Turu' : mode === 'yillar' ? '📅 Yıl Turu' : 'Tur'} {roundNo}
              </span>
              <span className="text-xs font-mono text-wave-400">{score} puan</span>
            </div>

            {phase === 'listening' && (
              <button onClick={() => { stopSnippet(); setPhase('answered') }} className="w-full flex flex-col items-center gap-4 py-6 cursor-pointer group">
                <div className="flex items-end gap-1 h-14">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-2 bg-gradient-to-t from-wave-500 to-fuchsia-400 rounded-full animate-wave" style={{ animationDelay: `${i * 0.12}s`, height: '100%' }} />
                  ))}
                </div>
                <p className="text-xs text-surface-300 flex items-center gap-2">
                  <Timer size={13} className="text-wave-400" /> Dinliyor... {secondsLeft}s &nbsp;·&nbsp; <span className="text-surface-500">(tıklayıp kes)</span>
                </p>
              </button>
            )}

            {phase === 'answered' && (
              <div className="space-y-2.5">
                {options.map((o) => {
                  const isCorrect = o.id === correct.id && guess !== null
                  const isPicked = o.id === guess
                  return (
                    <button
                      key={o.id}
                      disabled={phase !== 'answered'}
                      onClick={() => answer(o.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        isCorrect
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : isPicked
                            ? 'border-red-500/40 bg-red-500/10 text-red-300'
                            : 'border-surface-700/60 bg-white/[0.04] text-surface-300'
                      }`}
                    >
                      {mode !== 'yillar' && (
                        <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${o.cover_url ? '' : 'bg-surface-800'}`}>
                          {o.cover_url ? <img src={o.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-surface-500" /></div>}
                        </div>
                      )}
                      <span className="flex-1 text-left truncate">{answerLabel(o)}</span>
                      {mode !== 'yillar' && <span className="text-xs text-surface-500 truncate max-w-[120px]">{o.artist}</span>}
                      {o.id === correct.id && guess !== null && <ChevronRight size={16} className="text-emerald-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {phase === 'answered' && (
              <button
                onClick={loadRound}
                className="w-full mt-3 px-4 py-2.5 rounded-xl bg-wave-500/15 border border-wave-500/40 text-wave-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-wave-500/25 transition-colors"
              >
                <RotateCcw size={13} /> Sonraki Tur
              </button>
            )}

            {phase === 'idle' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wave-500/20 to-fuchsia-500/20 border border-wave-500/30 flex items-center justify-center animate-star-pulse">
                  <Volume2 size={26} className="text-wave-400" />
                </div>
                <p className="text-sm text-surface-300">Kesiti çal ve tahmin et</p>
                <div className="flex gap-3">
                  <button onClick={playSnippet} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-fuchsia-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-wave-500/25 flex items-center gap-2">
                    <Volume2 size={15} /> Çal {mode === 'zombi' && <span className="font-mono text-xs opacity-80">{zombieSpeed.toFixed(2)}x</span>}
                  </button>
                  <button onClick={loadRound} className="px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-surface-200 text-sm font-medium transition-colors flex items-center gap-2">
                    <RotateCcw size={14} /> Yeni Tur
                  </button>
                </div>
              </div>
            )}

            {guess && guess === correct?.id && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <Sparkles size={13} /> Doğru! Seri: {streak} · +{10 + Math.min(streak * 2, 20)} puan
              </div>
            )}
            {guess && guess !== correct?.id && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-fade-in">
                Yanlış! Cevap: <b>{correct.title}</b> — {correct.artist}
              </div>
            )}
            {mode === 'zombi' && (
              <p className="mt-3 text-[11px] text-surface-500 flex items-center gap-1.5">
                <Skull size={11} className="text-red-400" /> Zombi hızı: {zombieSpeed.toFixed(2)}x — doğru cevap hızlandırır, yanlış yavaşlatır
              </p>
            )}
          </div>
        ) : phase === 'loading' ? (
          <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : null}
      </div>
    </div>
  )
}