import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { formatDuration } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Slider } from '@/components/ui'
import Visualizer from '@/components/Visualizer'
import SyncedLyrics from '@/components/SyncedLyrics'
import type { Song } from '@/types'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, ChevronDown, Heart, Music2, Disc3, X,
  BarChart3, Waves, Circle, Flame, Radio,
  Maximize2,
} from 'lucide-react'
import type { VisualizerMode } from '@/types'

const VISUALIZER_MODES: { key: VisualizerMode; label: string; icon: typeof BarChart3 }[] = [
  { key: 'bars', label: 'Çubuk', icon: BarChart3 },
  { key: 'wave', label: 'Dalga', icon: Waves },
  { key: 'circle', label: 'Daire', icon: Circle },
  { key: 'fire', label: 'Ateş', icon: Flame },
  { key: 'party', label: 'Parti', icon: Maximize2 },
]

export default function NowPlaying() {
  const navigate = useNavigate()
  const { currentSong, volume, shuffle, repeat, equalizer, user, visualizerMode,
    eqPresets, saveEqPreset, deleteEqPreset, loadEqPreset,
    setVolume, setShuffle, setRepeat, setEqualizer, resetEqualizer, setVisualizerMode, setQueue, setCurrentSong } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, seek, nextSong, prevSong, analyserData } = useAudio()
  const [showEq, setShowEq] = useState(false)
  const [liked, setLiked] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [showSleep, setShowSleep] = useState(false)
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([])

  // Check like status
  useEffect(() => {
    if (!user || !currentSong) return
    supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', currentSong.id).maybeSingle().then(({ data }) => setLiked(!!data))
  }, [currentSong?.id])

  // Fetch related songs (same artist)
  useEffect(() => {
    if (!currentSong) return
    supabase.from('songs').select('*')
      .eq('artist', currentSong.artist)
      .neq('id', currentSong.id)
      .limit(10)
      .then(({ data }) => { if (data) setRelatedSongs(data) })
  }, [currentSong?.id])

  async function toggleLike() {
    if (!user || !currentSong) return
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', currentSong.id)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: currentSong.id })
      setLiked(true)
    }
  }

  if (!currentSong) return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-surface-500">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-800/50 flex items-center justify-center mb-6 shadow-lg">
        <Music2 size={40} className="opacity-30" />
      </div>
      <p className="text-lg font-medium">Şarkı seçilmedi</p>
      <button onClick={() => navigate('/')} className="text-wave-400 hover:text-wave-300 transition-colors mt-2 text-sm">Ana sayfaya dön</button>
    </div>
  )

  const progress = duration > 0 ? ((isSeeking ? seekValue : currentTime) / duration) * 100 : 0

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-surface-900 to-surface-950 overflow-hidden">
      <div className="flex items-center p-5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-surface-400 hover:text-white transition-colors p-1">
          <ChevronDown size={22} />
        </button>
        <span className="flex-1 text-center text-[11px] font-semibold text-gradient uppercase tracking-[0.15em]">Şimdi Çalıyor</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4">
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="relative flex-shrink-0">
            {currentSong.cover_url ? (
              <img src={currentSong.cover_url} alt="" className={`w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} />
            ) : (
              <div className="w-72 h-72 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
                <Music2 size={64} className="text-surface-500" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-20 h-20 rounded-2xl bg-gradient-to-br from-wave-500/20 to-wave-400/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
              <Disc3 size={28} className="text-wave-400 animate-spin-slow" />
            </div>
          </div>

          <div className="text-center max-w-md flex-shrink-0">
            <h1 className="text-2xl font-bold truncate">{currentSong.title}</h1>
            <p className="text-sm text-surface-400 mt-1.5 truncate">{currentSong.artist}</p>
          </div>

          <div className="w-full max-w-md">
            <Visualizer analyserData={analyserData} isPlaying={isPlaying} className="w-full h-16 rounded-xl" />
          </div>

          <div className="flex gap-2">
            {VISUALIZER_MODES.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setVisualizerMode(m.key)
                    if (m.key === 'party') {
                      document.documentElement.requestFullscreen?.()
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    visualizerMode === m.key
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon size={14} className="inline mr-1" />
                  {m.label}
                </button>
              )
            })}
            {visualizerMode === 'party' && document.fullscreenElement && (
              <button
                onClick={() => document.exitFullscreen()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10"
              >
                Tam Ekrandan Çık
              </button>
            )}
          </div>

          {currentSong.lyrics && (
            <SyncedLyrics lyrics={currentSong.lyrics} currentTime={currentTime} />
          )}

          {/* Controls */}
          <div className="w-full max-w-md space-y-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-surface-500 w-8 text-right font-mono tabular-nums">
                {formatDuration(isSeeking ? seekValue : currentTime)}
              </span>
              <div className="flex-1 relative group h-1.5">
                <div className="absolute inset-0 rounded-full bg-surface-700/50" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/60 group-hover:bg-wave-400 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range" min={0} max={duration || 100} step={0.1}
                  value={isSeeking ? seekValue : currentTime}
                  onMouseDown={() => { setIsSeeking(true); setSeekValue(currentTime) }}
                  onTouchStart={() => { setIsSeeking(true); setSeekValue(currentTime) }}
                  onChange={(e) => setSeekValue(Number(e.target.value))}
                  onMouseUp={() => { setIsSeeking(false); seek(seekValue) }}
                  onTouchEnd={() => { setIsSeeking(false); seek(seekValue) }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[11px] text-surface-500 w-8 font-mono tabular-nums">{formatDuration(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-5">
              <button onClick={() => setShuffle(!shuffle)} className={`transition-colors ${shuffle ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}>
                <Shuffle size={17} />
              </button>
              <button onClick={prevSong} className="text-surface-400 hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>
              <button onClick={togglePlay} className="bg-white text-surface-950 rounded-full p-3.5 hover:scale-105 transition-all shadow-2xl hover:shadow-white/10 active:scale-95">
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={nextSong} className="text-surface-400 hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>
              <button
                onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                className={`relative transition-colors ${repeat === 'all' ? 'text-wave-400' : repeat === 'one' ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}
                title={repeat === 'off' ? 'Repeat: Off' : repeat === 'all' ? 'Repeat: All' : 'Repeat: One'}
              >
                <Repeat size={17} />
                {repeat === 'one' && (
                  <span className="absolute -top-1.5 -right-1.5 bg-wave-400 text-surface-950 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow">1</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between px-2">
              <button onClick={toggleLike} className="transition-colors">
                <Heart size={17} className={liked ? 'fill-wave-400 text-wave-400' : 'text-surface-500 hover:text-wave-400'} />
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowEq(!showEq)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${showEq ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
                  EQ
                </button>
                <Volume2 size={15} className="text-surface-400" />
                <div className="w-20">
                  <Slider value={volume * 100} onChange={(v) => setVolume(v / 100)} />
                </div>
              </div>
            </div>

            {showEq && (
              <div className="glass rounded-2xl p-4 border border-surface-800/50 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold text-surface-300">Equalizer</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      const name = prompt('Preset adı:')
                      if (name?.trim()) saveEqPreset(name.trim())
                    }} className="text-xs text-wave-400 hover:underline">Kaydet</button>
                    <button onClick={resetEqualizer} className="text-xs text-surface-500 hover:text-white">Sıfırla</button>
                  </div>
                </div>
                {eqPresets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {eqPresets.map((p) => (
                      <div key={p.name} className="flex items-center gap-1 bg-surface-800/50 rounded-lg px-2 py-1">
                        <button onClick={() => loadEqPreset(p)} className="text-[11px] text-wave-400 hover:underline truncate max-w-20">{p.name}</button>
                        <button onClick={() => deleteEqPreset(p.name)} className="text-surface-500 hover:text-red-400 flex-shrink-0"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  {(['bass', 'mid', 'treble'] as const).map((key) => (
                    <div key={key} className="flex flex-col items-center gap-2.5 flex-1">
                      <input
                        type="range" min={-10} max={10}
                        value={equalizer[key]}
                        onChange={(e) => setEqualizer({ ...equalizer, [key]: Number(e.target.value) })}
                        className="h-20 w-1.5 accent-wave-400 [writing-mode:vertical-lr] appearance-none bg-surface-700 rounded-full"
                      />
                      <span className="text-[10px] text-surface-500 font-medium uppercase">
                        {key === 'bass' ? 'Bas' : key === 'mid' ? 'Mid' : 'Tiz'}
                      </span>
                        <span className="text-[10px] font-mono tabular-nums"
                          style={{ color: equalizer[key] > 0 ? '#22c7c0' : equalizer[key] < 0 ? '#ef4444' : '#6b7280' }}>
                          {equalizer[key] > 0 ? `+${equalizer[key]}` : equalizer[key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {relatedSongs.length > 0 && (
            <div className="w-full max-w-md flex-shrink-0 pb-8">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={16} className="text-wave-400" />
                <span className="text-sm font-semibold text-surface-300">Şarkı Radyosu</span>
              </div>
              <div className="flex flex-col gap-1">
                {relatedSongs.slice(0, 5).map((rs) => (
                  <div key={rs.id} onClick={() => { setQueue([currentSong!, ...relatedSongs]); setCurrentSong(rs) }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
                    {rs.cover_url ? <img src={rs.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover shadow-sm" /> : <div className="w-9 h-9 rounded-lg bg-surface-800 border border-surface-700/50 flex items-center justify-center"><Music2 size={14} className="text-surface-500" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-wave-400 transition-colors">{rs.title}</p>
                      <p className="text-xs text-surface-400 truncate">{rs.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}