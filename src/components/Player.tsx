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
import Visualizer from '@/components/Visualizer'
import { cacheAudio, removeCachedAudio, isAudioCached } from '@/lib/offline'
import { writeLike, bumpLikeCount } from '@/lib/likes'
import { emitToast } from '@/hooks/useToast'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, Music2, List, Maximize2, Heart,
  Timer, Keyboard, Minimize2, Star, ArrowUpDown, Download, XCircle,
  RotateCcw, FastForward,
} from 'lucide-react'

export default function Player() {
  const navigate = useNavigate()
  const { currentSong, user, volume, shuffle, repeat, queue, sleepTimer, playbackRate, miniPlayer,
    crossfade, crossfadeDuration, songRatings, equalizer, visualizerMode, seekStep,
    setVolume, setShuffle, setRepeat, setSleepTimer, setPlaybackRate, setMiniPlayer,
    setCrossfade, setCrossfadeDuration, setShowEqInPlayer, showEqInPlayer, pillMode, smartCache, lowDataMode } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, seek, nextSong, prevSong, analyserData } = useAudio()
  const [showVol, setShowVol] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSleep, setShowSleep] = useState(false)
  const [liked, setLiked] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showEq, setShowEq] = useState(false)
  const [cached, setCached] = useState(false)
  const [caching, setCaching] = useState(false)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)

  useEffect(() => {
    if (!currentSong) return
    let cancelled = false
    isAudioCached(currentSong.audio_url || '').then((v) => { if (!cancelled) setCached(v) })
    return () => { cancelled = true }
  }, [currentSong?.id, cached])

  // Akıllı önbellek (175): çalan şarkı + sıradaki önceden indirilir
  useEffect(() => {
    if (!currentSong || !smartCache || lowDataMode) return
    const targets = [currentSong.audio_url, queue.find((s) => s.id !== currentSong.id)?.audio_url]
    targets.forEach((url) => { if (url) cacheAudio(url) })
  }, [currentSong?.id, smartCache, lowDataMode])

  async function handleCache() {
    if (!currentSong?.audio_url) return
    setCaching(true)
    if (cached) {
      const ok = await removeCachedAudio(currentSong.audio_url)
      if (ok) { setCached(false); emitToast('Önbellekten kaldırıldı', 'info') }
    } else {
      const ok = await cacheAudio(currentSong.audio_url)
      if (ok) { setCached(true); emitToast('İndirildi — artık çevrimdışı dinlenebilir', 'success') }
      else emitToast('İndirme başarısız', 'error')
    }
    setCaching(false)
  }

  useEffect(() => {
    if (!currentSong || !user) { setLiked(false); return }
    supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', currentSong.id).maybeSingle().then(({ data }) => {
      setLiked(!!data)
    })
  }, [currentSong?.id, user?.id])

  async function toggleLike() {
    if (!currentSong || !user) return
    const ok = await writeLike(user.id, currentSong.id, liked)
    if (!ok) { emitToast('Beğeni güncellenemedi', 'error'); return }
    setLiked(!liked)
    bumpLikeCount(currentSong.id, currentSong.likes_count, liked ? -1 : 1)
  }

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

  // A-B loop enforcement
  useEffect(() => {
    if (loopA === null || loopB === null || loopA >= loopB) return
    if (currentTime >= loopB) seek(loopA)
  }, [currentTime, loopA, loopB, seek])

  // Reset A-B marks on song change
  useEffect(() => {
    setLoopA(null); setLoopB(null)
  }, [currentSong?.id])

  if (!currentSong) {
    return (
      <div className={`hidden md:flex ${pillMode
        ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] w-[min(94vw,980px)] h-16 items-center px-5 bg-surface-950/85 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl'
        : 'h-22 bg-surface-950/70 backdrop-blur-2xl border-t border-white/10 items-center px-5'}`}>
        <div className="flex items-center gap-4 text-surface-500">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-white/10 flex items-center justify-center shadow-sm">
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
  const energyHue = Math.max(24, 258 - progress * 1.75)
  const currentRating = songRatings[currentSong.id] || 0

  // Enhanced mini player with visualizer (Feature 5)
  if (miniPlayer) {
    return (
      <div className="hidden md:block fixed bottom-4 right-4 z-[100] glass border border-surface-700/60 rounded-2xl shadow-2xl shadow-wave-500/10 p-3 w-[340px] animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative flex-shrink-0">
            {currentSong.cover_url ? (
              <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
                <Music2 size={20} className="text-surface-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-semibold text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={togglePlay} className="bg-gradient-to-br from-wave-500 to-fuchsia-500 text-white rounded-full p-2 hover:scale-105 transition-all shadow-lg shadow-wave-500/25">
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={() => setMiniPlayer(false)} className="text-surface-400 hover:text-white transition-colors">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        <Visualizer analyserData={analyserData} isPlaying={isPlaying} className="w-full h-8 rounded-lg" />
        <div className="mt-1.5 h-1 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-wave-500 to-fuchsia-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`hidden md:flex ${pillMode
      ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] w-[min(94vw,980px)] h-16 items-center px-5 gap-4 bg-surface-950/85 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl shadow-wave-500/10'
      : 'h-22 bg-surface-950/70 backdrop-blur-2xl border-t border-white/10 items-center px-4 gap-4 z-50 shadow-[0_-10px_40px_-12px_rgba(139,92,246,0.15)]'}`}>
      {/* Song info (left, flexes equally so center stays truly centered) */}
      <div className="flex-1 min-w-0 flex items-center gap-3"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className="relative group cursor-pointer flex-shrink-0"
          onClick={() => navigate('/now-playing')}
        >
          {currentSong.cover_url ? (
            <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-wave-500/10 ring-1 ring-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
              <Music2 size={20} className="text-surface-500" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-wave-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-lg shadow-wave-500/40">
              <div className="flex items-end gap-[2px] h-2.5">
                {[1,2,3].map(i => (
                  <div key={i} className="w-0.5 bg-white rounded-full animate-wave" style={{ animationDelay: `${i * 0.15}s`, height: `${40 + i * 20}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div
          className="min-w-0 cursor-pointer relative"
          onClick={() => navigate('/now-playing')}
        >
          <p className="text-sm font-display font-semibold text-white truncate hover:text-wave-400 transition-colors">{currentSong.title}</p>
          <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
          {/* Rating display (Feature 4) */}
          {currentRating > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={8} className={s <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-surface-700'} />
              ))}
            </div>
          )}
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 glass rounded-xl p-3 border border-surface-800/50 shadow-2xl w-64 animate-fade-in z-50" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
              <div className="flex gap-3">
                {currentSong.cover_url ? <img src={currentSong.cover_url} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="w-16 h-16 rounded-lg bg-surface-800 flex items-center justify-center"><Music2 size={24} className="text-surface-500" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{currentSong.title}</p>
                  <p className="text-xs text-surface-400 truncate">{currentSong.artist}</p>
                  {currentSong.album && <p className="text-[11px] text-surface-500 truncate">{currentSong.album}</p>}
                  {currentSong.genre && <p className="text-[11px] text-surface-500 truncate">{currentSong.genre}</p>}
                  <p className="text-[11px] text-surface-500">{formatDuration(duration)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <button onClick={toggleLike} className={`transition-colors flex-shrink-0 ${liked ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={handleCache}
          disabled={caching || !currentSong.audio_url}
          className={`transition-colors flex-shrink-0 ${cached ? 'text-emerald-400' : 'text-surface-500 hover:text-emerald-400'} disabled:opacity-50`}
          title={cached ? 'Önbellekten kaldır' : 'Çevrimdışı için indir'}
        >
          {cached ? <XCircle size={15} /> : <Download size={15} />}
        </button>
      </div>

      {/* Center controls — fixed width, no flex-grow, so it rides the exact middle */}
      <div className="flex-none w-full max-w-[560px]">
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <button onClick={() => setShuffle(!shuffle)} className={`transition-colors ${shuffle ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}>
            <Shuffle size={15} />
          </button>
          <button onClick={prevSong} className="text-surface-400 hover:text-white transition-colors" title="Önceki">
            <SkipBack size={17} />
          </button>
          <button onClick={() => seek(Math.max(0, (isSeeking ? seekValue : currentTime) - seekStep))} className="text-surface-400 hover:text-wave-400 transition-colors" title={`-${seekStep}sn`}>
            <RotateCcw size={15} />
          </button>
          <button
            onClick={togglePlay}
            className="bg-gradient-to-br from-wave-500 to-fuchsia-500 text-white rounded-full p-2.5 hover:scale-105 transition-all shadow-lg shadow-wave-500/30 hover:shadow-fuchsia-500/30 active:scale-95"
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={() => seek(Math.min(duration, (isSeeking ? seekValue : currentTime) + seekStep))} className="text-surface-400 hover:text-wave-400 transition-colors" title={`+${seekStep}sn`}>
            <FastForward size={15} />
          </button>
          <button onClick={nextSong} className="text-surface-400 hover:text-white transition-colors" title="Sonraki">
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
          <button
            onClick={() => {
              if (loopA === null) setLoopA(Math.max(0, currentTime))
              else if (loopB === null) { setLoopB(Math.max(currentTime, (loopA || 0) + 1)); emitToast('A-B aralığı belirlendi', 'success') }
              else { setLoopA(null); setLoopB(null); emitToast('A-B döngüsü kapatıldı', 'info') }
            }}
            className={`relative transition-colors text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${loopB !== null ? 'text-amber-300 border border-amber-400/40' : loopA !== null ? 'text-wave-400 border border-wave-500/30' : 'text-surface-400 hover:text-white border border-transparent'}`}
            title={loopB !== null ? 'Döngüyü kapat' : loopA !== null ? 'B noktasını işaretle' : 'A noktasını işaretle'}
          >
            {loopB !== null ? 'A↔B' : loopA !== null ? 'B?' : 'A-B'}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-surface-500 w-9 text-right font-mono tabular-nums">{formatDuration(displayTime)}</span>
          <div className="flex-1 relative h-1.5 group">
            <div className="absolute inset-0 rounded-full bg-surface-700/50" />
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, hsl(${energyHue}, 82%, 60%), hsl(${Math.max(24, energyHue - 40)}, 90%, 52%))`, boxShadow: `0 0 10px hsla(${energyHue}, 90%, 60%, 0.55)` }}
            />
            {isPlaying && (
              <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: `hsl(${energyHue}, 95%, 65%)`, boxShadow: `0 0 12px hsla(${energyHue}, 95%, 65%, 0.9)` }} />
            )}
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

      {/* Right controls */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-2.5">
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
        {/* Quick EQ toggle (Feature 3) */}
        <div className="relative">
          <button onClick={() => setShowEq(!showEq)} className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${showEq ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-500 hover:text-white border border-transparent'}`} title="Ekolayzer">
            EQ
          </button>
          {showEq && (
            <div className="absolute bottom-full right-0 mb-2 glass rounded-2xl p-4 border border-surface-800/50 shadow-2xl w-72 animate-fade-in" onMouseLeave={() => setShowEq(false)}>
              <p className="text-xs font-semibold text-surface-300 mb-3">Ekolayzer</p>
              <div className="flex gap-1.5 justify-center items-end h-20">
                {[31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((freq, i) => {
                  const bands = equalizer.bands || [0,0,0,0,0,0,0,0,0,0]
                  const val = bands[i] || 0
                  return (
                    <div key={freq} className="flex flex-col items-center gap-0.5 flex-1">
                      <input
                        type="range" min={-10} max={10}
                        value={val}
                        onChange={(e) => {
                          const newBands = [...bands]
                          newBands[i] = Number(e.target.value)
                          useStore.getState().setEqualizer({ ...equalizer, bands: newBands })
                        }}
                        className="h-14 w-full accent-wave-400 [writing-mode:vertical-lr] appearance-none bg-surface-700 rounded-full"
                        style={{ transform: 'rotate(180deg)' }}
                      />
                      <span className="text-[7px] text-surface-600">{freq >= 1000 ? `${(freq/1000).toFixed(0)}k` : freq}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
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
                  onClick={() => setSleepTimer({ remaining: 0, endOfSong: true, active: true, fadeOut: false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sleepTimer.active && sleepTimer.endOfSong
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-400 hover:text-white border border-surface-700'
                  }`}
                >
                  Şarkı sonu
                </button>
                <button
                  onClick={() => setSleepTimer({ remaining: 30, endOfSong: false, active: true, fadeOut: true })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sleepTimer.active && sleepTimer.fadeOut
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-400 hover:text-white border border-surface-700'
                  }`}
                  title="Son 30 saniyede sesi yumuşatır"
                >
                  Yumuşak (30sn)
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
                      {sleepTimer.endOfSong ? 'Şarkı sonunda duracak' : sleepTimer.fadeOut ? '30 sn içinde yumuşak kapanış...' : `${Math.floor(sleepTimer.remaining / 60)}:${(sleepTimer.remaining % 60).toString().padStart(2, '0')} kaldı`}
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
            <div className="w-16 animate-fade-in">
              <Slider value={volume * 100} onChange={(v) => setVolume(v / 100)} />
            </div>
          )}
        </div>
      </div>
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}
