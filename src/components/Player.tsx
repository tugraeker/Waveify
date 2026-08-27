import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { formatDuration } from '@/lib/utils'
import { audioEngine } from '@/lib/audioEngine'
import { supabase } from '@/lib/supabase'
import { Slider } from '@/components/ui'
import { useAudio } from '@/hooks/useAudio'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, Music2, List, Heart,
} from 'lucide-react'

export default function Player() {
  const navigate = useNavigate()
  const { currentSong, user, volume, shuffle, repeat, queue, playbackRate,
    setVolume, setShuffle, setRepeat, setPlaybackRate } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, seek, nextSong, prevSong } = useAudio()
  const [showVol, setShowVol] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!currentSong || !user) { setLiked(false); return }
    supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', currentSong.id).maybeSingle().then(({ data }) => {
      setLiked(!!data)
    })
  }, [currentSong?.id, user?.id])

  async function toggleLike() {
    if (!currentSong || !user) return
    const { writeLike, bumpLikeCount } = await import('@/lib/likes')
    const ok = await writeLike(user.id, currentSong.id, liked)
    if (!ok) return
    setLiked(!liked)
    bumpLikeCount(currentSong.id, currentSong.likes_count, liked ? -1 : 1)
  }

  if (!currentSong) {
    return (
      <div className="hidden md:flex h-20 bg-[#181818] border-t border-[#282828] items-center px-5">
        <div className="flex items-center gap-4 text-[#666666]">
          <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center">
            <Music2 size={20} />
          </div>
          <div>
            <p className="text-sm font-medium">Henüz şarkı yok</p>
            <p className="text-xs text-[#666666]">Kitaplıktan bir şarkı seç</p>
          </div>
        </div>
      </div>
    )
  }

  const displayTime = isSeeking ? seekValue : currentTime
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  return (
    <div className="hidden md:flex h-20 bg-[#181818] border-t border-[#282828] items-center px-4 gap-4 z-50">
      {/* Song info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="cursor-pointer flex-shrink-0" onClick={() => navigate('/now-playing')}>
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center">
              <Music2 size={20} className="text-[#666666]" />
            </div>
          )}
        </div>
        <div className="min-w-0 cursor-pointer" onClick={() => navigate('/now-playing')}>
          <p className="text-sm font-medium text-white truncate hover:text-[#8b5cf6] transition-colors">{currentSong.title}</p>
          <p className="text-xs text-[#a1a1a1] truncate">{currentSong.artist}</p>
        </div>
        <button onClick={toggleLike} className={`transition-colors flex-shrink-0 ${liked ? 'text-red-400' : 'text-[#666666] hover:text-red-400'}`}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center controls */}
      <div className="flex-none w-full max-w-[500px]">
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <button onClick={() => setShuffle(!shuffle)} className={`transition-colors ${shuffle ? 'text-[#8b5cf6]' : 'text-[#a1a1a1] hover:text-white'}`}>
            <Shuffle size={15} />
          </button>
          <button onClick={prevSong} className="text-[#a1a1a1] hover:text-white transition-colors">
            <SkipBack size={17} />
          </button>
          <button
            onClick={togglePlay}
            className="bg-[#8b5cf6] text-white rounded-full p-2.5 hover:bg-[#7c3aed] transition-colors"
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={nextSong} className="text-[#a1a1a1] hover:text-white transition-colors">
            <SkipForward size={17} />
          </button>
          <button
            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
            className={`transition-colors ${repeat !== 'off' ? 'text-[#8b5cf6]' : 'text-[#a1a1a1] hover:text-white'}`}
          >
            <Repeat size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-[#666666] w-9 text-right font-mono">{formatDuration(displayTime)}</span>
          <div className="flex-1 relative h-1.5 group">
            <div className="absolute inset-0 rounded-full bg-[#3a3a3a]" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#8b5cf6] transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range" min={0} max={duration || 100} step={0.1}
              value={displayTime}
              onMouseDown={() => { setIsSeeking(true); setSeekValue(currentTime) }}
              onTouchStart={() => { setIsSeeking(true); setSeekValue(currentTime) }}
              onChange={(e) => setSeekValue(Number(e.target.value))}
              onMouseUp={() => { setIsSeeking(false); seek(seekValue) }}
              onTouchEnd={() => { setIsSeeking(false); seek(seekValue) }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[11px] text-[#666666] w-9 font-mono">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-3">
        <button
          onClick={() => {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
            const idx = rates.indexOf(playbackRate)
            const next = rates[(idx + 1) % rates.length]
            setPlaybackRate(next)
            audioEngine.setPlaybackRate(next)
          }}
          className={`text-xs font-mono font-bold px-2 py-1 rounded transition-colors ${playbackRate !== 1 ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'text-[#666666] hover:text-white'}`}
        >
          {playbackRate}x
        </button>
        <button onClick={() => navigate('/queue')} className="text-[#a1a1a1] hover:text-white transition-colors relative">
          <List size={17} />
          {queue.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#8b5cf6] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1.5" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
          <Volume2 size={15} className="text-[#a1a1a1] hover:text-white transition-colors cursor-pointer" />
          {showVol && (
            <div className="w-16 animate-fade-in">
              <Slider value={volume * 100} onChange={(v) => setVolume(v / 100)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
