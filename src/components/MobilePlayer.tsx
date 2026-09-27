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
  const currentSong = useStore((state) => state.currentSong)
  const user = useStore((state) => state.user)
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
    <div className="md:hidden z-40 mx-2 mb-[76px] overflow-hidden rounded-[20px] border border-white/[0.11] bg-[#171a24]/85 shadow-[0_14px_40px_rgba(0,0,0,.32)] backdrop-blur-2xl">
      <div className="h-[2px] bg-white/[0.08]">
        <div className="h-full bg-gradient-to-r from-wave-300 via-cyan-200 to-violet-300 transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate('/now-playing')}>
          {currentSong?.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="h-10 w-10 rounded-[13px] object-cover ring-1 ring-white/15" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.045]">
              <Music2 size={16} className="text-white/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/now-playing')}>
          <p className="truncate text-[12px] font-semibold text-white">{currentSong?.title || 'Henüz şarkı yok'}</p>
          <p className="truncate text-[10px] text-white/45">{currentSong?.artist || 'Bir şarkı seç'}</p>
        </div>
        {currentSong && (
          <button onClick={toggleLike} className={`flex-shrink-0 p-2 transition-colors ${liked ? 'text-wave-200' : 'text-white/35 hover:text-wave-200'}`}>
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}
        {currentSong && (
          <>
            <button onClick={prevSong} className="flex-shrink-0 rounded-full p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
              <SkipBack size={19} />
            </button>
            <button
              onClick={togglePlay}
              className="flex-shrink-0 rounded-full bg-wave-300 p-2.5 text-black shadow-[0_0_22px_rgba(198,255,62,.28)] transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextSong} className="flex-shrink-0 rounded-full p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
              <SkipForward size={19} />
            </button>
          </>
        )}
        {currentSong && (
          <span className="hidden font-mono text-[9px] tabular-nums text-white/35 min-[380px]:block">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  )
}
