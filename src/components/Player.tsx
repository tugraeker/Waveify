import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { formatDuration } from '@/lib/utils'
import { audioEngine } from '@/lib/audioEngine'
import { supabase } from '@/lib/supabase'
import { Slider } from '@/components/ui'
import { useAudio } from '@/hooks/useAudio'
import ShortcutsModal from '@/components/ShortcutsModal'
import CrossfadeControls from '@/components/CrossfadeControls'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, Music2, List, Maximize2, Heart,
  Timer, Keyboard, Minimize2,
} from 'lucide-react'

export default function Player() {
  const navigate = useNavigate()
  const { currentSong, user, volume, shuffle, repeat, queue, sleepTimer, playbackRate, miniPlayer,
    crossfade, crossfadeDuration,
    setVolume, setShuffle, setRepeat, setSleepTimer, setPlaybackRate, setMiniPlayer,
    setCrossfade, setCrossfadeDuration } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, seek, nextSong, prevSong } = useAudio()
  const [showVol, setShowVol] = useState(false)
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(128))
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSleep, setShowSleep] = useState(false)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!currentSong || !user) { setLiked(false); return }
    supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', currentSong.id).maybeSingle().then(({ data }) => {
      setLiked(!!data)
    })
  }, [currentSong?.id, user?.id])

  async function toggleLike() {
    if (!currentSong || !user) return
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', currentSong.id)
      await supabase.from('songs').update({ likes_count: Math.max(0, (currentSong.likes_count || 0) - 1) }).eq('id', currentSong.id)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: currentSong.id })
      await supabase.from('songs').update({ likes_count: (currentSong.likes_count || 0) + 1 }).eq('id', currentSong.id)
      setLiked(true)
    }
  }

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => setAudioData(audioEngine.getAnalyserData()), 80)
    return () => clearInterval(id)
  }, [isPlaying])

  // ? key to open shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true)
      }
      if (e.key === 'Escape') setShowShortcuts(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!currentSong) {
    return (
      <div className="h-22 bg-surface-950 border-t border-surface-800/30 flex items-center px-5">
        <div className="flex items-center gap-4 text-surface-500">
          <div className="w-12 h-12 rounded-xl bg-surface-900 border border-surface-800 flex items-center justify-center">
            <Music2 size={22} className="opacity-40" />
          </div>
          <div>
            <p className="text-sm font-medium">Henüz şarkı yok</p>
            <p className="text-xs text-surface-600">Kitaplıktan bir şarkı seç</p>
          </div>
        </div>
      </div>
    )
  }

  const displayTime = isSeeking ? seekValue : currentTime
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  if (miniPlayer) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl p-3 w-[320px] animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {currentSong.cover_url ? (
              <img src={currentSong.cover_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
                <Music2 size={24} className="text-surface-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
            <div className="mt-2 h-1 bg-surface-700 rounded-full overflow-hidden">
              <div className="h-full bg-wave-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="bg-wave-500 text-white rounded-full p-2 hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={() => setMiniPlayer(false)} className="text-surface-400 hover:text-white transition-colors">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-22 bg-surface-950 border-t border-surface-800/30 flex items-center px-4 gap-3 z-50">
      <div className="flex items-center gap-3 w-[280px] min-w-0">
        <div
          className="relative group cursor-pointer flex-shrink-0"
          onClick={() => navigate('/now-playing')}
        >
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-full object-cover shadow-lg" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
              <Music2 size={20} className="text-surface-500" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-wave-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="flex items-end gap-[2px] h-2.5">
                {[1,2,3].map(i => (
                  <div key={i} className="w-0.5 bg-white rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s`, height: `${40 + i * 20}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div
          className="min-w-0 cursor-pointer"
          onClick={() => navigate('/now-playing')}
        >
          <p className="text-sm font-medium text-white truncate hover:text-wave-400 transition-colors">{currentSong.title}</p>
          <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
        </div>
        <button onClick={toggleLike} className={`transition-colors flex-shrink-0 ${liked ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex-1 max-w-[560px] mx-auto">
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <button onClick={() => setShuffle(!shuffle)} className={`transition-colors ${shuffle ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}>
            <Shuffle size={15} />
          </button>
          <button onClick={prevSong} className="text-surface-400 hover:text-white transition-colors">
            <SkipBack size={17} />
          </button>
          <button
            onClick={togglePlay}
            className="bg-white text-surface-950 rounded-full p-2.5 hover:scale-105 transition-all shadow-lg hover:shadow-white/10 active:scale-95"
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={nextSong} className="text-surface-400 hover:text-white transition-colors">
            <SkipForward size={17} />
          </button>
          <button
            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
            className={`relative transition-colors ${repeat === 'all' ? 'text-wave-400' : repeat === 'one' ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}
            title={repeat === 'off' ? 'Repeat: Off' : repeat === 'all' ? 'Repeat: All' : 'Repeat: One'}
          >
            <Repeat size={15} />
            {repeat === 'one' && (
              <span className="absolute -top-1.5 -right-1.5 bg-wave-400 text-surface-950 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow">1</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-surface-500 w-9 text-right font-mono tabular-nums">{formatDuration(displayTime)}</span>
          <div className="flex-1 relative h-1.5 group">
            <div className="absolute inset-0 rounded-full bg-surface-700/50" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/60 group-hover:bg-wave-400 transition-all duration-75"
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
          <span className="text-[11px] text-surface-500 w-9 font-mono tabular-nums">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="w-[260px] flex items-center justify-end gap-2.5">
        <CrossfadeControls
          crossfade={crossfade}
          crossfadeDuration={crossfadeDuration}
          onToggle={() => setCrossfade(!crossfade)}
          onDurationChange={setCrossfadeDuration}
        />
        <button
          onClick={() => {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
            const idx = rates.indexOf(playbackRate)
            const next = rates[(idx + 1) % rates.length]
            setPlaybackRate(next)
            audioEngine.setPlaybackRate(next)
          }}
          className={`text-xs font-mono font-bold px-2 py-1 rounded-lg transition-colors ${playbackRate !== 1 ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-500 hover:text-white border border-transparent'}`}
          title={`Hız: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
        <button onClick={() => setShowShortcuts(true)} className="text-surface-400 hover:text-white transition-colors" title="Kısayollar">
          <Keyboard size={15} />
        </button>
        <div className="relative">
          <button onClick={() => setShowSleep(!showSleep)} className={`text-surface-400 hover:text-white transition-colors ${sleepTimer.active ? 'text-wave-400' : ''}`} title="Zamanlayıcı">
            <Timer size={15} />
          </button>
          {showSleep && (
            <div className="absolute bottom-full right-0 mb-2 glass rounded-2xl p-4 border border-surface-800/50 shadow-2xl w-56 animate-fade-in" onMouseLeave={() => setShowSleep(false)}>
              <p className="text-xs font-semibold text-surface-300 mb-3">Uyku Zamanlayıcısı</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[5, 10, 15, 30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSleepTimer({ remaining: m * 60, endOfSong: false, active: true })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sleepTimer.active && sleepTimer.remaining === m * 60
                        ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                        : 'text-surface-400 hover:text-white border border-surface-700'
                    }`}
                  >
                    {m} dk
                  </button>
                ))}
                <button
                  onClick={() => setSleepTimer({ remaining: 0, endOfSong: true, active: true })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sleepTimer.active && sleepTimer.endOfSong
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-400 hover:text-white border border-surface-700'
                  }`}
                >
                  Şarkı sonu
                </button>
                {sleepTimer.active && (
                  <button
                    onClick={() => setSleepTimer({ remaining: 0, endOfSong: false, active: false })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30"
                  >
                    İptal
                  </button>
                )}
              </div>
              {sleepTimer.active && (
                <p className="text-xs text-wave-400 text-center">
                  {sleepTimer.endOfSong ? 'Şarkı sonunda duracak' : `${Math.floor(sleepTimer.remaining / 60)}:${(sleepTimer.remaining % 60).toString().padStart(2, '0')} kaldı`}
                </p>
              )}
            </div>
          )}
        </div>
        <button onClick={() => navigate('/queue')} className="text-surface-400 hover:text-white transition-colors relative">
          <List size={17} />
          {queue.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 bg-wave-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow">
              {queue.length}
            </span>
          )}
        </button>
        <button onClick={() => navigate('/now-playing')} className="text-surface-400 hover:text-white transition-colors">
          <Maximize2 size={13} />
        </button>
        <button onClick={() => setMiniPlayer(true)} className="text-surface-400 hover:text-white transition-colors" title="Mini Oynatıcı">
          <Minimize2 size={13} />
        </button>
        <div className="flex items-center gap-1.5" onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}>
          <Volume2 size={15} className="text-surface-400 hover:text-white transition-colors cursor-pointer" />
          {showVol && (
            <div className="w-20 animate-fade-in">
              <Slider value={volume * 100} onChange={(v) => setVolume(v / 100)} />
            </div>
          )}
        </div>
      </div>
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}