import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { audioEngine } from '@/lib/audioEngine'
import { formatDuration } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { cacheAudio, removeCachedAudio, isAudioCached } from '@/lib/offline'
import { emitToast } from '@/hooks/useToast'
import { Slider } from '@/components/ui'
import Visualizer from '@/components/Visualizer'
import SyncedLyrics from '@/components/SyncedLyrics'
import type { Song, VisualizerMode, VisualizerColorTheme, CoverStyle } from '@/types'
import { EQ_PRESETS, EQ_BAND_FREQS, defaultEqBands, ROOM_PRESETS } from '@/types'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, ChevronDown, Heart, Music2, Disc3, X,
  BarChart3, Waves, Circle, Flame, Radio,
  Maximize2, Share2, Star, Pencil, Info, ListPlus,
  Palette, Plus, Check, FileText, Save, Zap, Volume1, Landmark, Download, XCircle, Mic2,
} from 'lucide-react'

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

export default function NowPlaying() {
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
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', currentSong.id)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: currentSong.id })
      setLiked(true)
    }
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
      <div className="flex items-center p-5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-surface-400 hover:text-white transition-colors p-1">
          <ChevronDown size={22} />
        </button>
        <span className="flex-1 text-center text-[11px] font-semibold text-gradient uppercase tracking-[0.15em]">Şimdi Çalıyor</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex flex-col items-center gap-5 py-4">
          {/* Cover art */}
          <div className="relative flex-shrink-0 group">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-wave-500/25 via-fuchsia-500/15 to-amber-400/20 blur-2xl pointer-events-none" />
            {currentSong.cover_url ? (
              <>
                {coverStyle === 'vinyl' && (
                  <img src={currentSong.cover_url} alt="" className={`relative w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl shadow-wave-500/10 ring-1 ring-white/15 object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} />
                )}
                {coverStyle === 'cd' && (
                  <div className={`relative w-72 h-72 md:w-80 md:h-80 rounded-full shadow-2xl shadow-cyan-500/10 overflow-hidden ${isPlaying ? 'animate-spin-slow' : ''}`}>
                    <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover rounded-full" style={{ clipPath: 'circle(46% at 50% 50%)' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, rgba(220,240,255,0.12) 0px, rgba(220,240,255,0.12) 1.5px, transparent 2px, transparent 4px)' }} />
                    <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-slate-200 via-white to-slate-400 shadow-inner" />
                    <div className="absolute inset-[44%] rounded-full bg-surface-950" />
                  </div>
                )}
                {coverStyle === 'cassette' && (
                  <div className="relative w-72 h-72 md:w-80 md:h-80 rotate-1 rounded-2xl border border-surface-700 shadow-2xl shadow-fuchsia-500/10 overflow-hidden" style={{ background: '#15151f' }}>
                    <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-fuchsia-600 via-amber-500 to-cyan-500 opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 opacity-80" />
                    <img src={currentSong.cover_url} alt="" className="absolute inset-x-5 top-14 bottom-14 rounded-md object-cover" />
                    <div className="absolute inset-x-0 top-[44%] h-8 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-6 rounded-sm bg-white/80" />
                        <div className="w-4 h-6 rounded-sm bg-white/80" />
                      </div>
                    </div>
                  </div>
                )}
                {coverStyle === 'polaroid' && (
                  <div className="relative w-72 h-72 md:w-80 md:h-80 -rotate-2 rounded-md bg-gradient-to-br from-white to-slate-200 p-3 pb-10 shadow-2xl shadow-amber-500/10">
                    <img src={currentSong.cover_url} alt="" className="w-full h-full rounded-sm object-cover" />
                    <p className="absolute bottom-2 inset-x-0 text-center text-[10px] font-display tracking-[0.2em] text-surface-800 uppercase">waveify · {currentSong.title.split(' ')[0] || 'anı'}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center">
                <Music2 size={64} className="text-surface-500" />
              </div>
            )}
            {isPlaying && currentSong.cover_url && coverStyle !== 'polaroid' && coverStyle !== 'cassette' && (
              <div className="absolute inset-0 rounded-full pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-surface-950/70 backdrop-blur-sm border-2 border-white/25 shadow-xl shadow-black/40 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-black/50 border border-white/20" />
                </div>
              </div>
            )}
            <button onClick={() => setEditingCover(!editingCover)} className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity text-white">
              <Pencil size={14} />
            </button>
          </div>

          {/* Cover style picker */}
          <div className="flex items-center gap-1.5">
            {COVER_STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setCoverStyle(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  coverStyle === s.key
                    ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                    : 'text-surface-500 hover:text-white border border-transparent'
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          {editingCover && (
            <div className="w-full max-w-md flex gap-2 animate-fade-in">
              <input type="text" value={coverUrlInput} onChange={(e) => setCoverUrlInput(e.target.value)} placeholder="Kapak URL'si" className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
              <button onClick={saveCover} className="h-9 px-3 rounded-xl bg-wave-500 text-white text-xs font-medium hover:bg-wave-400 transition-colors"><Check size={14} /></button>
            </div>
          )}

          {/* Song title & artist */}
          <div className="text-center max-w-md flex-shrink-0">
            {editingMetadata ? (
              <div className="space-y-2 animate-fade-in">
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white text-center" placeholder="Başlık" />
                <input type="text" value={metaArtist} onChange={(e) => setMetaArtist(e.target.value)} className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white text-center" placeholder="Sanatçı" />
                <div className="flex gap-2">
                  <input type="text" value={metaAlbum} onChange={(e) => setMetaAlbum(e.target.value)} className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white" placeholder="Albüm" />
                  <input type="text" value={metaGenre} onChange={(e) => setMetaGenre(e.target.value)} className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white" placeholder="Tür" />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={saveMetadata} className="h-8 px-4 rounded-lg bg-wave-500 text-white text-xs font-medium"><Check size={14} className="inline mr-1" />Kaydet</button>
                  <button onClick={() => setEditingMetadata(false)} className="h-8 px-4 rounded-lg bg-surface-800 text-surface-300 text-xs font-medium">İptal</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-display font-bold truncate">{currentSong.title}</h1>
                <p className="text-sm text-surface-400 mt-1.5 truncate">{currentSong.artist}</p>
                {currentSong.album && <p className="text-xs text-surface-500 mt-0.5">{currentSong.album}</p>}
              </>
            )}
            {!editingMetadata && (
              <button onClick={() => setEditingMetadata(true)} className="text-xs text-surface-500 hover:text-wave-400 mt-1 transition-colors">
                <Pencil size={12} className="inline mr-1" />Düzenle
              </button>
            )}
          </div>

          {/* Star Rating (Feature 4) */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => handleRating(star)} className="transition-transform hover:scale-110">
                <Star size={22} className={star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-surface-600'} />
              </button>
            ))}
            {currentRating > 0 && <span className="text-xs text-surface-400 ml-2">{currentRating}/5</span>}
          </div>

          {/* Visualizer */}
          <div className="w-full max-w-md">
            <Visualizer analyserData={analyserData} isPlaying={isPlaying} className="w-full h-16 rounded-xl" />
          </div>

          {/* Visualizer controls */}
          <div className="flex flex-wrap gap-2 items-center justify-center">
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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

          {/* Visualizer color theme + sensitivity (Feature 12) */}
          <div className="flex flex-wrap gap-3 items-center justify-center w-full max-w-md">
            <div className="flex flex-wrap gap-1.5">
              {VIZ_COLOR_THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setVisualizerColorTheme(t.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    visualizerColorTheme === t.key
                      ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                      : 'text-surface-500 border border-transparent hover:text-white'
                  }`}
                >
                  <Palette size={10} className="inline mr-1" />{t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500">Hassasiyet</span>
              <input type="range" min={0.2} max={2} step={0.1} value={visualizerSensitivity}
                onChange={(e) => setVisualizerSensitivity(Number(e.target.value))}
                className="w-16 accent-wave-400" />
            </div>
          </div>

          {/* Synced Lyrics with edit (Feature 10) */}
          {currentSong.lyrics || editingLyrics ? (
            editingLyrics ? (
              <div className="w-full max-w-md animate-fade-in">
                <textarea value={lyricsText} onChange={(e) => setLyricsText(e.target.value)}
                  className="w-full h-40 rounded-xl bg-surface-800 border border-surface-700 p-3 text-sm text-white resize-none"
                  placeholder="Şarkı sözlerini buraya girin... [mm:ss.xx] ile zaman damgası ekleyin" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveLyrics} className="h-8 px-4 rounded-lg bg-wave-500 text-white text-xs font-medium"><Save size={12} className="inline mr-1" />Kaydet</button>
                  <button onClick={() => setEditingLyrics(false)} className="h-8 px-4 rounded-lg bg-surface-800 text-surface-300 text-xs font-medium">İptal</button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <SyncedLyrics lyrics={currentSong.lyrics || ''} currentTime={currentTime} onSeek={seek} />
                <button onClick={() => setEditingLyrics(true)} className="text-xs text-surface-500 hover:text-wave-400 mt-1 transition-colors">
                  <Pencil size={12} className="inline mr-1" />Sözleri Düzenle
                </button>
              </div>
            )
          ) : (
            <button onClick={() => { setEditingLyrics(true); setLyricsText('') }} className="text-xs text-surface-500 hover:text-wave-400 border border-dashed border-surface-700 rounded-lg px-4 py-2 transition-colors">
              <Plus size={12} className="inline mr-1" />Söz Ekle
            </button>
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
                  {currentSong.year && <div className="flex justify-between"><span className="text-surface-500">Yıl</span><span className="text-white">{currentSong.year}</span></div>}
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
              <div className="glass rounded-2xl p-4 border border-surface-800/50 animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2">
                    <button onClick={() => setEqTab('graphic')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'graphic' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>Grafik</button>
                    <button onClick={() => setEqTab('presets')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'presets' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>Presetler</button>
                    <button onClick={() => setEqTab('effects')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'effects' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>
                      <Zap size={11} className="inline mr-0.5 -mt-0.5" />Efektler
                    </button>
                  </div>
                  <button onClick={resetEqualizer} className="text-xs text-surface-500 hover:text-white">Sıfırla</button>
                </div>

                {eqTab === 'graphic' ? (
                  <div className="flex gap-1.5 justify-center items-end h-28">
                    {EQ_BAND_FREQS.map((freq, i) => {
                      const val = bands[i] || 0
                      const pct = ((val + 10) / 20) * 100
                      return (
                        <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[9px] font-mono tabular-nums"
                            style={{ color: val > 0 ? '#22c7c0' : val < 0 ? '#ef4444' : '#6b7280' }}>
                            {val > 0 ? `+${val}` : val}
                          </span>
                          <input
                            type="range" min={-10} max={10}
                            value={val}
                            onChange={(e) => {
                              const newBands = [...bands]
                              newBands[i] = Number(e.target.value)
                              setEqualizer({ ...equalizer, bands: newBands })
                            }}
                            className="h-20 w-full accent-wave-400 [writing-mode:vertical-lr] appearance-none bg-surface-700 rounded-full"
                            style={{ transform: 'rotate(180deg)' }}
                          />
                          <span className="text-[8px] text-surface-500">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : eqTab === 'presets' ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {eqPresets.map((p) => (
                        <div key={p.name} className="flex items-center gap-1 bg-surface-800/50 rounded-lg px-2 py-1">
                          <button onClick={() => loadEqPreset(p)} className="text-[11px] text-wave-400 hover:underline truncate max-w-20">{p.name}</button>
                          <button onClick={() => deleteEqPreset(p.name)} className="text-surface-500 hover:text-red-400 flex-shrink-0"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {EQ_PRESETS.map((p) => (
                        <button key={p.name} onClick={() => {
                          setEqualizer({ ...equalizer, bands: [...p.bands] })
                          const existing = eqPresets.find(ep => ep.name === p.name)
                          if (existing) loadEqPreset(existing)
                        }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-surface-800/50 text-surface-300 hover:text-white transition-colors">
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={savingPreset} onChange={(e) => setSavingPreset(e.target.value)}
                        placeholder="Preset adı..." className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-xs text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
                      <button onClick={handleSavePreset} className="h-8 px-3 rounded-lg bg-wave-500 text-white text-xs font-medium">Kaydet</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Volume1 size={12} />Bas Geliştirme</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.bass > 0 ? `+${Math.round(audioEffects.bass * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.bass}
                        onChange={(e) => setAudioEffects({ ...audioEffects, bass: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Disc3 size={12} />Yankı (Reverb)</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.reverb > 0 ? `+${Math.round(audioEffects.reverb * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.reverb}
                        onChange={(e) => setAudioEffects({ ...audioEffects, reverb: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Landmark size={12} />3D Genişlik</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.spatial > 0 ? `+${Math.round(audioEffects.spatial * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.spatial}
                        onChange={(e) => setAudioEffects({ ...audioEffects, spatial: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Mic2 size={12} />Karaoke — Vokal Kaldır</span>
                        <span className="text-[10px] text-fuchsia-400 font-mono">{audioEffects.vocal ? `${Math.round((audioEffects.vocal || 0) * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.vocal || 0}
                        onChange={(e) => setAudioEffects({ ...audioEffects, vocal: Number(e.target.value), vocalIso: false })}
                        className="w-full accent-fuchsia-400" />
                    </div>
                    <label className="flex items-center justify-between text-xs text-surface-300 cursor-pointer select-none">
                      <span className="flex items-center gap-1"><Zap size={12} />Vokal İzolasyon (sadece vokal)</span>
                      <input type="checkbox" checked={!!audioEffects.vocalIso}
                        onChange={(e) => setAudioEffects({ ...audioEffects, vocalIso: e.target.checked })}
                        className="accent-fuchsia-400 w-3.5 h-3.5" />
                    </label>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Disc3 size={12} />8D Ses (baş dönme seviyesi)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">%{Math.round((audioEffects.eightD || 0) * 100)}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.eightD || 0}
                        onChange={(e) => setAudioEffects({ ...audioEffects, eightD: Number(e.target.value) })}
                        className="w-full accent-emerald-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Landmark size={12} />Oda Sahnesi</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ROOM_PRESETS.map((r) => (
                          <button key={r.key} onClick={() => setAudioEffects({ ...audioEffects, room: r.key })}
                            className={`px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                              (audioEffects.room || 'hall') === r.key
                                ? 'bg-wave-500/15 text-wave-300 border-wave-500/40 shadow-sm'
                                : 'bg-surface-800/60 text-surface-500 border-surface-700/60 hover:text-surface-300'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setAudioEffects({ bass: 0, reverb: 0, spatial: 0, vocal: 0, vocalIso: false, eightD: 0, room: 'hall' })}
                      className="text-[11px] text-surface-500 hover:text-white transition-colors">
                      Efektleri Sıfırla
                    </button>
                  </div>
                )}
              </div>
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
    </div>
  )
}
