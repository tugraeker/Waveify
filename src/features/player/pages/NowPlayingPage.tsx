import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { audioEngine } from '@/lib/audioEngine'
import { formatDuration } from '@/lib/utils'
import { supabase } from '../../../core/supabaseClient'
import { writeLike } from '@/lib/likes'
import { cacheAudio, removeCachedAudio, isAudioCached } from '@/lib/offline'
import { emitToast } from '@/hooks/useToast'
import { Slider } from '@/components/ui'
import Visualizer from '@/components/Visualizer'
import SyncedLyrics from '@/components/SyncedLyrics'
import StageView from './StageView';
import LyricsPanel from './LyricsPanel';
import EffectsPanel from './EffectsPanel';
import { StrobeOverlay, Goniometer, EnergySegments, CommentDots, ClockMode, BookmarksPanel, TimestampCommentsPanel } from '@/components/NowPlayingExtras'
import type { Song, VisualizerMode, VisualizerColorTheme, CoverStyle } from '@/types'
import { EQ_PRESETS, EQ_BAND_FREQS, defaultEqBands, ROOM_PRESETS } from '@/types'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, ChevronDown, Heart, Music2, Disc3, X,
  BarChart3, Waves, Circle, Flame, Radio,
  Maximize2, Share2, Star, Pencil, Info, ListPlus,
  Palette, Plus, Check, FileText, Save, Zap, Volume1, Landmark, Download, XCircle, Mic2,
  Activity, Clock3, Sparkles, Dna, Mic,
} from 'lucide-react'
import SongDNAModal from '@/components/SongDNA'
import { useVoiceCommands } from '@/hooks/useVoiceCommands'

const VISUALIZER_MODES: { key: VisualizerMode; label: string; icon: typeof BarChart3 }[] = [
  { key: 'bars', label: 'Çubuk', icon: BarChart3 },
  { key: 'wave', label: 'Dalga', icon: Waves },
  { key: 'circle', label: 'Daire', icon: Circle },
  { key: 'fire', label: 'Ateş', icon: Flame },
  { key: 'party', label: 'Parti', icon: Maximize2 },
  { key: 'spectrum', label: 'Spektrum', icon: BarChart3 },
  { key: 'particles', label: 'Parçacık', icon: Circle },
  { key: 'dual', label: 'Çift', icon: Waves },
  { key: 'stars', label: 'Yıldız', icon: Star },
  { key: 'concert', label: 'Konser', icon: Zap },
]

const COVER_STYLES: { key: CoverStyle; label: string; emoji: string }[] = [
  { key: 'vinyl', label: 'Plak', emoji: '💿' },
  { key: 'cassette', label: 'Kaset', emoji: '📼' },
  { key: 'cd', label: 'CD', emoji: '💽' },
  { key: 'polaroid', label: 'Polaroid', emoji: '📷' },
]

const VIZ_COLOR_THEMES: { key: VisualizerColorTheme; label: string }[] = [
  { key: 'wave', label: 'Wave' },
  { key: 'rainbow', label: 'Gökkuşağı' },
  { key: 'fire', label: 'Ateş' },
  { key: 'ice', label: 'Buz' },
  { key: 'neon', label: 'Neon' },
  { key: 'pastel', label: 'Pastel' },
  { key: 'mono', label: 'Tek Renk' },
]

export default function NowPlayingPage() {
  const navigate = useNavigate()
  const {
    currentSong, volume, shuffle, repeat, equalizer, user, visualizerMode,
    visualizerColorTheme, visualizerSensitivity, crossfade, crossfadeDuration,
    eqPresets, saveEqPreset, deleteEqPreset, loadEqPreset,
    setVolume, setShuffle, setRepeat, setEqualizer, resetEqualizer, setVisualizerMode,
    setVisualizerColorTheme, setVisualizerSensitivity, setQueue, setCurrentSong,
    setCrossfade, setCrossfadeDuration, songRatings, setSongRating,
    songNotes, setSongNote, playlists, audioEffects, setAudioEffects,
    radio, setRadio, queue, coverStyle, setCoverStyle } = useStore()
  const { isPlaying, currentTime, duration, togglePlay, seek, nextSong, prevSong, analyserData } = useAudio()
  const [showEq, setShowEq] = useState(false)
  const [liked, setLiked] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [showSleep, setShowSleep] = useState(false)
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([])
  const [showInfo, setShowInfo] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editingMetadata, setEditingMetadata] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaArtist, setMetaArtist] = useState('')
  const [metaAlbum, setMetaAlbum] = useState('')
  const [metaGenre, setMetaGenre] = useState('')
  const [editingLyrics, setEditingLyrics] = useState(false)
  const [lyricsText, setLyricsText] = useState('')
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const [eqTab, setEqTab] = useState<'graphic' | 'presets' | 'effects'>('graphic')
  const [savingPreset, setSavingPreset] = useState('')
  const [showEqPresets, setShowEqPresets] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [coverUrlInput, setCoverUrlInput] = useState('')
  const [touchX, setTouchX] = useState<number | null>(null)
  const [touchY, setTouchY] = useState<number | null>(null)
  const [showGonio, setShowGonio] = useState(false)
  const [clockOpen, setClockOpen] = useState(false)
  const [showDNA, setShowDNA] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)

  useVoiceCommands(voiceActive)

  const shareSong = useCallback(() => {
    if (!currentSong) return
    const base = import.meta.env.VITE_PUBLIC_URL || 'https://waveify.app'
    const link = `${base}/song/${currentSong.id}`
    navigator.clipboard.writeText(link)
    const toast = document.createElement('div')
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white shadow-2xl animate-fade-in'
    toast.textContent = 'Link kopyalandı'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1500)
  }, [currentSong])

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

  // Init note + lyrics edit values
  useEffect(() => {
    if (currentSong) {
      setNoteText(songNotes[currentSong.id] || '')
      setMetaTitle(currentSong.title)
      setMetaArtist(currentSong.artist)
      setMetaAlbum(currentSong.album || '')
      setMetaGenre(currentSong.genre || '')
      setLyricsText(currentSong.lyrics || '')
      setCoverUrlInput(currentSong.cover_url || '')
    }
  }, [currentSong?.id])

  async function toggleLike() {
    if (!user || !currentSong) return
    const ok = await writeLike(user.id, currentSong.id, liked)
    if (ok) setLiked(!liked)
  }

  function handleRating(rating: number) {
    if (!currentSong) return
    setSongRating(currentSong.id, rating === songRatings[currentSong.id] ? 0 : rating)
  }

  function saveMetadata() {
    if (!currentSong) return
    const updated = { ...currentSong, title: metaTitle, artist: metaArtist, album: metaAlbum, genre: metaGenre }
    setCurrentSong(updated)
    setEditingMetadata(false)
    if (user) {
      supabase.from('songs').update({ title: metaTitle, artist: metaArtist, album: metaAlbum, genre: metaGenre }).eq('id', currentSong.id)
    }
  }

  function saveLyrics() {
    if (!currentSong) return
    const updated = { ...currentSong, lyrics: lyricsText }
    setCurrentSong(updated)
    setEditingLyrics(false)
    if (user) {
      supabase.from('songs').update({ lyrics: lyricsText }).eq('id', currentSong.id)
    }
  }

  function saveCover() {
    if (!currentSong) return
    const updated = { ...currentSong, cover_url: coverUrlInput || undefined }
    setCurrentSong(updated)
    setEditingCover(false)
    if (user && coverUrlInput) {
      supabase.from('songs').update({ cover_url: coverUrlInput }).eq('id', currentSong.id)
    }
  }

  function handleSavePreset() {
    const name = savingPreset.trim()
    if (!name) return
    saveEqPreset(name)
    setSavingPreset('')
    setShowEqPresets(false)
  }

  function addToPlaylist(playlist: any) {
    if (!currentSong || !user) return
    const currentSongs = playlist.songs || []
    if (currentSongs.some((s: Song) => s.id === currentSong.id)) return
    const updatedSongs = [...currentSongs, currentSong]
    supabase.from('playlist_songs').insert({ playlist_id: playlist.id, song_id: currentSong.id })
    setShowAddToPlaylist(false)
  }

  function toggleRadio() {
    if (!currentSong) return
    if (radio.active) {
      setRadio({ active: false, seedId: null })
      return
    }
    setRadio({ active: true, seedId: currentSong.id })
    if (!queue.some((s) => s.id === currentSong.id)) {
      setQueue([currentSong, ...queue])
    }
    if (!isPlaying) togglePlay()
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchX(e.touches[0].clientX)
    setTouchY(e.touches[0].clientY)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchX === null || touchY === null) return
    const dx = e.changedTouches[0].clientX - touchX
    const dy = e.changedTouches[0].clientY - touchY
    setTouchX(null); setTouchY(null)
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) nextSong()
    else prevSong()
  }

  useEffect(() => {
    audioEngine.setEffects(audioEffects)
  }, [audioEffects])

  const [cached, setCached] = useState(false)
  const [caching, setCaching] = useState(false)

  useEffect(() => {
    if (!currentSong?.audio_url) return
    let cancelled = false
    isAudioCached(currentSong.audio_url).then((v) => { if (!cancelled) setCached(v) })
    return () => { cancelled = true }
  }, [currentSong?.id, cached])

  async function handleCache() {
    if (!currentSong?.audio_url) return
    setCaching(true)
    if (cached) {
      const ok = await removeCachedAudio(currentSong.audio_url)
      if (ok) { setCached(false); emitToast('Önbellekten kaldırıldı', 'info') }
    } else {
      const ok = await cacheAudio(currentSong.audio_url)
      if (ok) { setCached(true); emitToast('İndirildi — çevrimdışı dinlenebilir', 'success') }
      else emitToast('İndirme başarısız', 'error')
    }
    setCaching(false)
  }

  const currentRating = currentSong ? songRatings[currentSong.id] || 0 : 0
  const currentNote = currentSong ? songNotes[currentSong.id] || '' : ''

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
  const bands = equalizer.bands || defaultEqBands()

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-surface-900 to-surface-950 overflow-hidden">
      <StrobeOverlay />
      <div className="flex items-center p-5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-surface-400 hover:text-white transition-colors p-1">
          <ChevronDown size={22} />
        </button>
        <span className="flex-1 text-center text-[11px] font-semibold text-gradient uppercase tracking-[0.15em]">Şimdi Çalıyor</span>
        <button onClick={() => setClockOpen(true)} className="text-surface-400 hover:text-wave-400 transition-colors p-1" title="Masa Saati Modu">
          <Clock3 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex flex-col items-center gap-5 py-4">
          <StageView
            currentSong={currentSong}
            isPlaying={isPlaying}
            analyserData={analyserData}
            coverStyle={coverStyle}
            setCoverStyle={setCoverStyle}
            editingCover={editingCover}
            setEditingCover={setEditingCover}
            coverUrlInput={coverUrlInput}
            setCoverUrlInput={setCoverUrlInput}
            saveCover={saveCover}
            editingMetadata={editingMetadata}
            setEditingMetadata={setEditingMetadata}
            metaTitle={metaTitle}
            setMetaTitle={setMetaTitle}
            metaArtist={metaArtist}
            setMetaArtist={setMetaArtist}
            metaAlbum={metaAlbum}
            setMetaAlbum={setMetaAlbum}
            metaGenre={metaGenre}
            setMetaGenre={setMetaGenre}
            saveMetadata={saveMetadata}
            currentRating={currentRating}
            handleRating={handleRating}
            visualizerMode={visualizerMode}
            setVisualizerMode={setVisualizerMode}
            visualizerColorTheme={visualizerColorTheme}
            setVisualizerColorTheme={setVisualizerColorTheme}
            visualizerSensitivity={visualizerSensitivity}
            setVisualizerSensitivity={setVisualizerSensitivity}
            showGonio={showGonio}
            setShowGonio={setShowGonio}
          />

          <LyricsPanel
            currentSong={currentSong}
            currentTime={currentTime}
            seek={seek}
            editingLyrics={editingLyrics}
            setEditingLyrics={setEditingLyrics}
            lyricsText={lyricsText}
            setLyricsText={setLyricsText}
            saveLyrics={saveLyrics}
          />

          {/* Controls */}
          <div className="w-full max-w-md space-y-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-surface-500 w-8 text-right font-mono tabular-nums">
                {formatDuration(isSeeking ? seekValue : currentTime)}
              </span>
              <div className="flex-1 relative group h-1.5">
                <div className="absolute inset-0 rounded-full bg-surface-700/50" />
                <EnergySegments songId={currentSong.id} duration={duration} />
                <CommentDots songId={currentSong.id} duration={duration} onSeek={seek} />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/60 group-hover:bg-wave-400 transition-all duration-75 z-20"
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
                <button onClick={() => setShowAddToPlaylist(!showAddToPlaylist)} className="text-surface-500 hover:text-wave-400 transition-colors" title="Çalma Listesine Ekle">
                  <ListPlus size={17} />
                </button>
                <button onClick={() => { setShowShare(!showShare); setShowShare(true) }} className="text-surface-500 hover:text-wave-400 transition-colors" title="Paylaş">
                  <Share2 size={15} />
                </button>
                <button
                  onClick={handleCache}
                  disabled={caching || !currentSong.audio_url}
                  className={`transition-colors disabled:opacity-50 ${cached ? 'text-emerald-400' : 'text-surface-500 hover:text-emerald-400'}`}
                  title={cached ? 'Önbellekten kaldır' : 'Çevrimdışı için indir'}
                >
                  {cached ? <XCircle size={15} /> : <Download size={15} />}
                </button>
                <button onClick={() => setShowInfo(!showInfo)} className={`transition-colors ${showInfo ? 'text-wave-400' : 'text-surface-500 hover:text-wave-400'}`} title="Bilgi">
                  <Info size={15} />
                </button>
                <button
                  onClick={() => setShowDNA(true)}
                  className="text-surface-500 hover:text-amber-400 transition-colors"
                  title="Yapay Zeka Şarkı DNA'sı"
                >
                  <Dna size={15} />
                </button>
                <button
                  onClick={() => {
                    const next = !voiceActive
                    setVoiceActive(next)
                    emitToast(next ? '🎤 Sesli komutlar dinleniyor...' : 'Sesli komutlar kapatıldı', 'info')
                  }}
                  className={`transition-colors ${voiceActive ? 'text-rose-400 animate-pulse' : 'text-surface-500 hover:text-rose-400'}`}
                  title={voiceActive ? 'Sesli Komut Açık (Tıkla ve Kapat)' : 'Sesli Komutları Başlat'}
                >
                  <Mic size={15} />
                </button>
                <button onClick={() => setShowEq(!showEq)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${showEq ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
                  EQ
                </button>
                <Volume2 size={15} className="text-surface-400" />
                <div className="w-20">
                  <Slider value={volume * 100} onChange={(v) => setVolume(v / 100)} />
                </div>
              </div>
            </div>

            {/* Add to Playlist dropdown (Feature 8) */}
            {showAddToPlaylist && (
              <div className="glass rounded-2xl p-3 border border-surface-800/50 animate-fade-in">
                <p className="text-xs font-semibold text-surface-300 mb-2">Çalma Listesine Ekle</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {playlists.filter(p => p.type === 'custom').map((pl) => (
                    <button key={pl.id} onClick={() => addToPlaylist(pl)}
                      className="w-full text-left text-sm text-surface-300 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
                      {pl.name}
                    </button>
                  ))}
                  {playlists.filter(p => p.type === 'custom').length === 0 && (
                    <p className="text-xs text-surface-500 text-center py-2">Özel çalma listeniz yok</p>
                  )}
                </div>
              </div>
            )}

            {/* Share panel (Feature 9) */}
            {showShare && (
              <div className="glass rounded-2xl p-3 border border-surface-800/50 animate-fade-in" onMouseLeave={() => setShowShare(false)}>
                <p className="text-xs font-semibold text-surface-300 mb-2">Paylaş</p>
                <div className="flex gap-2">
                  <button onClick={shareSong} className="flex-1 text-xs bg-surface-800 hover:bg-surface-700 text-white rounded-lg px-3 py-2 transition-colors">Link Kopyala</button>
                  <button onClick={() => { shareSong(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${currentSong.title} - ${currentSong.artist}`)}`, '_blank') }} className="flex-1 text-xs bg-surface-800 hover:bg-surface-700 text-white rounded-lg px-3 py-2 transition-colors">Twitter</button>
                  <button onClick={() => { shareSong(); window.open(`https://wa.me/?text=${encodeURIComponent(`${currentSong.title} - ${currentSong.artist}`)}`, '_blank') }} className="flex-1 text-xs bg-surface-800 hover:bg-surface-700 text-white rounded-lg px-3 py-2 transition-colors">WhatsApp</button>
                </div>
              </div>
            )}

            {/* Song Info panel (Feature 11) */}
            {showInfo && (
              <div className="glass rounded-2xl p-4 border border-surface-800/50 animate-fade-in">
                <p className="text-xs font-semibold text-surface-300 mb-3">Şarkı Bilgisi</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-surface-500">Başlık</span><span className="text-white">{currentSong.title}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Sanatçı</span><span className="text-white">{currentSong.artist}</span></div>
                  {currentSong.album && <div className="flex justify-between"><span className="text-surface-500">Albüm</span><span className="text-white">{currentSong.album}</span></div>}
                  {currentSong.genre && <div className="flex justify-between"><span className="text-surface-500">Tür</span><span className="text-white">{currentSong.genre}</span></div>}
                  <div className="flex justify-between"><span className="text-surface-500">Süre</span><span className="text-white">{formatDuration(duration)}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Puan</span><span className="text-yellow-400">{currentRating > 0 ? `${currentRating}/5` : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Eklenme</span><span className="text-white">{new Date(currentSong.created_at).toLocaleDateString('tr-TR')}</span></div>
                  {(true) && <div className="flex justify-between"><span className="text-surface-500">Yıl</span><span className="text-white">{(currentSong.created_at ? new Date(currentSong.created_at).getFullYear() : 'Belirsiz')}</span></div>}
                  {currentSong.bpm && <div className="flex justify-between"><span className="text-surface-500">BPM</span><span className="text-white">{currentSong.bpm}</span></div>}
                  {currentSong.key && <div className="flex justify-between"><span className="text-surface-500">Anahtar</span><span className="text-white">{currentSong.key}</span></div>}
                  <div className="flex justify-between"><span className="text-surface-500">Dosya</span><span className="text-white text-[10px] truncate max-w-[180px]">{currentSong.audio_url?.split('/').pop()}</span></div>
                </div>
              </div>
            )}

            {/* Song notes (Feature 6) */}
            <div className="w-full">
              <button onClick={() => setEditingNote(!editingNote)} className="text-xs text-surface-500 hover:text-wave-400 transition-colors">
                <FileText size={12} className="inline mr-1" />{currentNote ? 'Notu Düzenle' : 'Not Ekle'}
              </button>
              {editingNote && (
                <div className="mt-2 animate-fade-in">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                    className="w-full h-20 rounded-xl bg-surface-800 border border-surface-700 p-3 text-sm text-white resize-none"
                    placeholder="Bu şarkı hakkında notlar..." />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => { setSongNote(currentSong!.id, noteText); setEditingNote(false) }} className="h-7 px-3 rounded-lg bg-wave-500 text-white text-[11px] font-medium"><Save size={11} className="inline mr-1" />Kaydet</button>
                    <button onClick={() => setEditingNote(false)} className="h-7 px-3 rounded-lg bg-surface-800 text-surface-400 text-[11px] font-medium">İptal</button>
                  </div>
                </div>
              )}
              {currentNote && !editingNote && (
                <p className="text-xs text-surface-400 mt-1.5 italic bg-surface-800/30 rounded-lg p-2">{currentNote}</p>
              )}
            </div>

            {/* Bookmarks (107) + Timestamp comments (179) */}
            <BookmarksPanel songId={currentSong.id} currentTime={currentTime} onSeek={seek} />
            <TimestampCommentsPanel songId={currentSong.id} currentTime={currentTime} onSeek={seek} />

            {/* Crossfade (Feature 3) */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-surface-400">Geçiş Efekti</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCrossfade(!crossfade)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${crossfade ? 'bg-wave-500' : 'bg-surface-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${crossfade ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                {crossfade && (
                  <div className="flex items-center gap-1">
                    <input type="range" min={1} max={10} step={0.5} value={crossfadeDuration}
                      onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                      className="w-16 accent-wave-400" />
                    <span className="text-[10px] text-surface-500 w-6">{crossfadeDuration}s</span>
                  </div>
                )}
              </div>
            </div>

          {/* 10-band Equalizer (Features 1 & 2) */}
          {showEq && (
            <EffectsPanel
              eqTab={eqTab}
              setEqTab={setEqTab}
              bands={bands}
              equalizer={equalizer}
              setEqualizer={setEqualizer}
              eqPresets={eqPresets}
              loadEqPreset={loadEqPreset}
              deleteEqPreset={deleteEqPreset}
              savingPreset={savingPreset}
              setSavingPreset={setSavingPreset}
              handleSavePreset={handleSavePreset}
              resetEqualizer={resetEqualizer}
              audioEffects={audioEffects}
              setAudioEffects={setAudioEffects}
            />
          )}
          </div>

          {/* Related songs */}
          {relatedSongs.length > 0 && (
            <div className="w-full max-w-md flex-shrink-0 pb-8">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={toggleRadio}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                    radio.active
                      ? 'bg-wave-500 text-white shadow-lg shadow-wave-500/30 animate-pulse'
                      : 'bg-wave-500/10 text-wave-400 border border-wave-500/30 hover:bg-wave-500/20'
                  }`}
                >
                  <Radio size={14} />
                  {radio.active ? 'Radyo Çalıyor' : 'Radyo Başlat'}
                </button>
                <span className="text-sm font-semibold text-surface-300 flex-1 truncate">
                  {currentSong.artist}
                </span>
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
      <ClockMode open={clockOpen} onClose={() => setClockOpen(false)} />
      {/* Song DNA Modal */}
      {showDNA && currentSong && (
        <SongDNAModal song={currentSong} onClose={() => setShowDNA(false)} />
      )}
    </div>
  )
}
