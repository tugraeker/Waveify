import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import { useAudio } from '@/hooks/useAudio'
import { formatDuration } from '@/lib/utils'
import { Play, Pause, SkipBack, SkipForward, Music2, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { writeLike, bumpLikeCount } from '@/lib/likes'

export default function MobilePlayer() {
  const navigate = useNavigate()
  const { currentSong, user } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, nextSong, prevSong } = useAudio()
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!currentSong || !user) { setLiked(false); return }
    supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', currentSong.id).maybeSingle().then(({ data }) => {
      setLiked(!!data)
    })
  }, [currentSong?.id, user?.id])

  async function toggleLike() {
    if (!currentSong || !user) return
    const ok = await writeLike(user.id, currentSong.id, liked)
    if (!ok) return
    setLiked(!liked)
    bumpLikeCount(currentSong.id, currentSong.likes_count, liked ? -1 : 1)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="md:hidden bg-surface-950 border-t border-surface-800/30 z-40">
      <div className="h-0.5 bg-surface-800/60">
        <div className="h-full bg-wave-400 transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate('/now-playing')}>
          {currentSong?.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
              <Music2 size={16} className="text-surface-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/now-playing')}>
          <p className="text-[13px] font-medium text-white truncate">{currentSong?.title || 'Henüz şarkı yok'}</p>
          <p className="text-[11px] text-surface-400 truncate">{currentSong?.artist || 'Bir şarkı seç'}</p>
        </div>
        {currentSong && (
          <button onClick={toggleLike} className={`p-2 transition-colors flex-shrink-0 ${liked ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}
        {currentSong && (
          <>
            <button onClick={prevSong} className="p-2 text-surface-400 hover:text-white transition-colors flex-shrink-0">
              <SkipBack size={19} />
            </button>
            <button
              onClick={togglePlay}
              className="bg-white text-surface-950 rounded-full p-2.5 hover:scale-105 transition-all active:scale-95 flex-shrink-0"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextSong} className="p-2 text-surface-400 hover:text-white transition-colors flex-shrink-0">
              <SkipForward size={19} />
            </button>
          </>
        )}
        {currentSong && (
          <span className="text-[10px] text-surface-500 font-mono tabular-nums hidden min-[380px]:block">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  )
}
