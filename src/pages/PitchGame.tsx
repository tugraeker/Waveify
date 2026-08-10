import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { resolveAudioUrl } from '@/lib/offline'
import { Play, RotateCcw, Trophy, Ear, X } from 'lucide-react'
import { emitToast } from '@/hooks/useToast'
import { confettiBurst } from '@/lib/party'
import type { Song } from '@/types'

const SPEEDS = [
  { key: 0.75, label: '🐢 Yavaş' },
  { key: 1.0, label: '🎯 Tam hız' },
  { key: 1.3, label: '🐇 Hızlı' },
]

export default function PitchGame() {
  const { setQueue, setCurrentSong } = useStore()
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [pool, setPool] = useState<Song[]>([])
  const [current, setCurrent] = useState<Song | null>(null)
  const [secretSpeed, setSecretSpeed] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [guessed, setGuessed] = useState<number | null>(null)
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const totalRounds = 10

  useEffect(() => {
    supabase.from('songs').select('*').then(({ data }) => {
      if (data) setPool(data as Song[])
    })
    return () => { audioRef.current?.pause(); audioRef.current = null }
  }, [])

  function pick() {
    const audio = pool.filter((s) => s.audio_url)
    if (audio.length === 0) return
    const song = audio[Math.floor(Math.random() * audio.length)]
    setCurrent(song)
    setGuessed(null)
    setPlaying(false)
    const sp = SPEEDS[Math.floor(Math.random() * SPEEDS.length)]
    setSecretSpeed(sp.key)
  }

  async function playSnippet() {
    if (!current) return
    const el = audioRef.current || new Audio()
    audioRef.current = el
    el.pause()
    const url = await resolveAudioUrl(current.audio_url!)
    el.src = url
    el.playbackRate = secretSpeed
    el.volume = 0.9
    el.onloadedmetadata = () => {
      try { el.currentTime = current.duration * 0.25 || 10 } catch {}
      el.play().then(() => setPlaying(true)).catch(() => {})
    }
    setTimeout(() => { el.pause(); setPlaying(false) }, 3500)
  }

  function guess(speedKey: number) {
    setGuessed(speedKey)
    audioRef.current?.pause()
    setPlaying(false)
    const correct = speedKey === secretSpeed
    if (correct) {
      setScore((s) => s + 10)
      setTimeout(() => confettiBurst(undefined, undefined, 140, ['#ec4899', '#a855f7', '#22d3ee']), 200)
    }
    setTimeout(() => {
      if (round >= totalRounds) {
        setFinished(true)
        try {
          const best = JSON.parse(localStorage.getItem('waveify_pitch_best') || '0')
          const finalScore = score + (correct ? 10 : 0)
          if (finalScore > best) {
            localStorage.setItem('waveify_pitch_best', String(finalScore))
            emitToast(`🏆 Yeni rekor: ${finalScore}/100`, 'success')
          }
        } catch {}
      } else {
        setRound((r) => r + 1)
        pick()
      }
    }, 1600)
  }

  function restart() {
    setRound(1); setScore(0); setFinished(false)
    pick()
  }

  const best = Number(localStorage.getItem('waveify_pitch_best') || 0)

  if (finished) {
    return (
      <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in flex items-center justify-center">
        <div className="glass rounded-3xl p-10 text-center max-w-sm w-full">
          <Trophy size={56} className="mx-auto text-amber-400 mb-4 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
          <h2 className="text-2xl font-display font-bold mb-1">Maç bitti!</h2>
          <p className="text-surface-400 text-sm mb-6">Kulak keskinliği skorun</p>
          <p className="text-5xl font-display font-bold text-gradient mb-2">{score}<span className="text-xl text-surface-500">/{totalRounds * 10}</span></p>
          <p className="text-xs text-surface-500 mb-6">Rekor: {best}/100 · {((score / (totalRounds * 10)) * 100) >= 70 ? '👂 Altın kulak' : ((score / (totalRounds * 10)) * 100) >= 40 ? '👍 İyi başlangıç' : '🌱 Pratik yap, dinle'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={restart} className="h-10 px-5 rounded-xl bg-wave-500 text-white text-sm font-bold hover:bg-wave-400 transition-colors">Tekrar Oyna</button>
            <button onClick={() => navigate('/')} className="h-10 px-5 rounded-xl bg-surface-800/60 border border-surface-700 text-surface-300 text-sm font-semibold hover:text-white transition-all">Ana Sayfa</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center"><Ear size={20} className="text-fuchsia-400" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold">Perde Oyunu</h1>
            <p className="text-xs text-surface-500">Şarkı gizli bir hızda çalıyor — kulaklarını test et</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-400 glass rounded-xl px-3 py-2">Tur <strong className="text-white">{round}</strong>/{totalRounds}</span>
          <span className="text-xs text-fuchsia-300 glass rounded-xl px-3 py-2 font-mono tabular-nums">Skor: <strong>{score}</strong></span>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 max-w-lg mx-auto text-center">
        {!current ? (
          <div className="py-10 space-y-4">
            <p className="text-surface-400 text-sm">Kütüphaneden bir şarkı seçilecek...</p>
            <button onClick={pick} disabled={pool.length === 0} className="h-11 px-6 rounded-xl bg-wave-500 text-white font-bold hover:bg-wave-400 transition-colors disabled:opacity-50">
              Başla
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-lg font-semibold text-white truncate">{current.title}</p>
              <p className="text-sm text-surface-400">{current.artist}</p>
            </div>
            <button
              onClick={playSnippet}
              disabled={playing}
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
                playing ? 'bg-fuchsia-500/20 border border-fuchsia-500/40' : 'bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-2xl shadow-fuchsia-500/30 animate-pulse'
              }`}
            >
              {playing ? (
                <span className="flex gap-1.5">
                  {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
                </span>
              ) : (
                <Play size={28} fill="white" className="text-white ml-1" />
              )}
            </button>
            <p className="text-xs text-surface-500 mt-3 mb-6">{playing ? 'Dinleniyor...' : guessed === null ? '🎧 Çal\'a bas ve hızı dinle' : ''}</p>

            {guessed === null ? (
              <div className="grid grid-cols-3 gap-2">
                {SPEEDS.map((s) => (
                  <button key={s.key} onClick={() => guess(s.key)} disabled={playing}
                    className={`py-3.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-40 ${
                      'bg-surface-800/60 border-surface-700 text-white hover:border-fuchsia-400/50 hover:bg-surface-800'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className={`py-4 rounded-xl text-sm font-bold ${guessed === secretSpeed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                {guessed === secretSpeed ? '✅ Doğru kulak! +10' : `❌ Doğrusu: ${SPEEDS.find((s) => s.key === secretSpeed)?.label}`}
                <p className="text-[10px] font-normal mt-1 text-surface-400">Sonraki soru geliyor...</p>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-center text-[10px] text-surface-600 mt-6 flex items-center justify-center gap-1">
        <RotateCcw size={11} /> 10 tur · Her doğru 10 puan · Rekor: {best}
      </p>
    </div>
  )
}