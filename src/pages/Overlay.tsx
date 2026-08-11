import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { formatDuration } from '@/lib/utils'
import { Music2 } from 'lucide-react'

export default function Overlay() {
  const currentSong = useStore((s) => s.currentSong)
  const isPlaying = useStore((s) => s.isPlaying)
  const volume = useStore((s) => s.volume)
  const playbackRate = useStore((s) => s.playbackRate)
  const currentTime = useStore((s) => s.currentTime)
  const [show, setShow] = useState(true)
  const [lastSongId, setLastSongId] = useState<string | null>(null)

  useEffect(() => {
    const iv = setInterval(() => {
      const t = useStore.getState().currentTime
      const active = useStore.getState().isPlaying
      const songId = useStore.getState().currentSong?.id || null
      if (songId !== lastSongId) {
        setLastSongId(songId)
        setShow(true)
      } else if (active) {
        setShow(true)
      } else if (!active && songId) {
        setShow(false)
      }
      void t
    }, 2000)
    return () => clearInterval(iv)
  }, [lastSongId])

  const progress = currentSong?.duration ? Math.min(100, (currentTime / currentSong.duration) * 100) : 0

  return (
    <div className="w-full h-screen bg-transparent flex flex-col justify-end p-6">
      <div className="relative">
        <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-full" />
        <div className={`relative transition-opacity duration-700 ${show && currentSong ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-5">
            {currentSong?.cover_url ? (
              <img src={currentSong.cover_url} alt="" className="w-40 h-40 rounded-3xl object-cover shadow-2xl shadow-black/60 ring-1 ring-white/20" />
            ) : (
              <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-surface-800 to-surface-900 ring-1 ring-white/20 flex items-center justify-center">
                <Music2 size={48} className="text-surface-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-wave-400 mb-1 flex items-center gap-2">
                {isPlaying && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                Şimdi Çalıyor
              </p>
              <h1 className="text-5xl font-display font-extrabold text-white truncate max-w-[900px] drop-shadow-lg">{currentSong?.title || '—'}</h1>
              <p className="text-2xl text-surface-300 mt-1 truncate max-w-[700px]">{currentSong?.artist || ''}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden min-w-[200px]">
                  <div className="h-full bg-gradient-to-r from-wave-500 to-fuchsia-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-mono text-surface-400 tabular-nums">
                  {formatDuration(currentTime)} / {formatDuration(currentSong?.duration || 0)}
                </span>
                {playbackRate !== 1 && <span className="text-sm font-mono text-amber-300">{playbackRate}x</span>}
                <span className="text-sm font-mono text-surface-400">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
