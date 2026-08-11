import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { writeLike, bumpLikeCount } from '@/lib/likes'
import { formatDuration } from '@/lib/utils'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { SongSkeleton } from '@/components/Skeleton'
import { emitToast } from '@/hooks/useToast'
import type { Song } from '@/types'
import { Play, Music, AudioWaveform, Heart, Plus, ListMusic, SlidersHorizontal, ArrowUpDown, Grid2x2, List } from 'lucide-react'
import { trackLike, awardXp, trackSongLiked } from '@/lib/achievements'

export default function Library() {
  const { songs, setSongs, setQueue, setCurrentSong, currentSong, user, addToQueue } = useStore()
  const navigate = useNavigate()
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [showPlaylistModal, setShowPlaylistModal] = useState<Song | null>(null)
  const [filterText, setFilterText] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterArtist, setFilterArtist] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'artist' | 'duration'>('date')
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [view, setView] = useState<'list' | 'mosaic'>('list')

  const genres = [...new Set(songs.map((s) => s.genre).filter(Boolean))]
  const artists = [...new Set(songs.map((s) => s.artist).filter(Boolean))]
  let filteredSongs = songs.filter((s) => {
    if (filterText && !s.title.toLowerCase().includes(filterText.toLowerCase()) && !s.artist.toLowerCase().includes(filterText.toLowerCase())) return false
    if (filterGenre && s.genre !== filterGenre) return false
    if (filterArtist && s.artist !== filterArtist) return false
    return true
  })
  if (sortBy === 'title') filteredSongs.sort((a, b) => a.title.localeCompare(b.title))
  else if (sortBy === 'artist') filteredSongs.sort((a, b) => a.artist.localeCompare(b.artist))
  else if (sortBy === 'duration') filteredSongs.sort((a, b) => b.duration - a.duration)
  else filteredSongs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  useEffect(() => { fetchSongs(); fetchLikes() }, [])

  async function fetchSongs() {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    if (data) setSongs(data)
    setLoading(false)
  }

  async function fetchLikes() {
    if (!user) return
    const { data } = await supabase.from('likes').select('song_id').eq('user_id', user.id)
    if (data) setLikedIds(new Set(data.map((l: any) => l.song_id)))
  }

  const playSong = (song: Song) => { setQueue(songs); setCurrentSong(song) }

  async function toggleLike(song: Song) {
    if (!user) return
    const isLiked = likedIds.has(song.id)
    const ok = await writeLike(user.id, song.id, isLiked)
    if (!ok) { emitToast('Beğeni güncellenemedi', 'error'); return }
    if (isLiked) {
      likedIds.delete(song.id)
      bumpLikeCount(song.id, song.likes_count, -1)
      emitToast('Beğeni kaldırıldı', 'info')
    } else {
      likedIds.add(song.id)
      bumpLikeCount(song.id, song.likes_count, 1)
      trackLike()
      trackSongLiked(song.user_id, user.id)
      awardXp(2)
      emitToast('Beğenildi!', 'success')
    }
    setLikedIds(new Set(likedIds))
  }

  function handleContextMenu(e: React.MouseEvent, song: Song) {
    e.preventDefault()
    setCtxMenu({ song, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold">Kitaplık</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-900/50 border border-white/10 rounded-xl p-1">
            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-wave-500/15 text-wave-400' : 'text-surface-500 hover:text-white'}`} title="Liste görünümü"><List size={14} /></button>
            <button onClick={() => setView('mosaic')} className={`p-1.5 rounded-lg transition-all ${view === 'mosaic' ? 'bg-wave-500/15 text-wave-400' : 'text-surface-500 hover:text-white'}`} title="Kapak mozaik duvar"><Grid2x2 size={14} /></button>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${showFilters || filterText || filterGenre || filterArtist ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-500 hover:text-white border border-transparent'}`}>
            <SlidersHorizontal size={13} /> Filtrele
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-surface-900/60 border border-surface-800/50 rounded-2xl animate-fade-in">
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Şarkı veya sanatçı ara..."
            className="flex-1 min-w-[200px] bg-surface-800 border border-surface-700 rounded-xl px-4 py-2 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50"
          />
          <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-wave-400/50">
            <option value="">Tüm Türler</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)} className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-wave-400/50">
            <option value="">Tüm Sanatçılar</option>
            {artists.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown size={13} className="text-surface-500" />
            {(['date', 'title', 'artist', 'duration'] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${sortBy === s ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500 hover:text-white'}`}>
                {s === 'date' ? 'Tarih' : s === 'title' ? 'İsim' : s === 'artist' ? 'Sanatçı' : 'Süre'}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-1"><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>
      ) : filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-surface-500 glass rounded-2xl border-dashed">
            <AudioWaveform size={56} className="mb-5 opacity-30" />
            <p className="text-base font-medium text-surface-400">Henüz şarkı yok</p>
            <p className="text-sm mt-1 text-surface-500">Şarkı yüklemek için "Yükle" bölümüne gidin</p>
            <button onClick={() => navigate('/upload')} className="mt-4 text-sm text-wave-400 hover:text-wave-300 font-medium transition-colors">Şarkı Yükle</button>
          </div>
      ) : view === 'mosaic' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
          {filteredSongs.map((song) => (
            <div key={song.id} onClick={() => playSong(song)} onContextMenu={(e) => handleContextMenu(e, song)} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-[1.04] hover:z-10 transition-all duration-200 hover:shadow-2xl shadow-black/40">
              {song.cover_url ? (
                <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
                  <Music size={20} className="text-surface-500" />
                </div>
              )}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 ${currentSong?.id === song.id ? 'opacity-100 ring-2 ring-wave-400' : ''}`}>
                <p className="text-[11px] font-semibold text-white truncate">{song.title}</p>
                <p className="text-[10px] text-surface-300 truncate">{song.artist}</p>
              </div>
              {currentSong?.id === song.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-wave-500 flex items-center justify-center shadow-lg">
                  <Play size={10} fill="white" className="text-white ml-0.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filteredSongs.map((song) => (
            <div key={song.id} className="song-row group flex items-center gap-3.5 p-2.5 rounded-xl transition-all duration-200 card-hover" onContextMenu={(e) => handleContextMenu(e, song)}>
              <div className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song)}>
                <div className="relative w-11 h-11 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
                      <Music size={18} className="text-surface-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={14} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(song) }} className="p-1.5 rounded-lg text-surface-500 hover:text-wave-400 transition-colors" title="Listeye ekle">
                  <ListMusic size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleLike(song) }} className={`p-1.5 rounded-lg transition-colors ${likedIds.has(song.id) ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`} title={likedIds.has(song.id) ? 'Beğeniyi kaldır' : 'Beğen'}>
                  <Heart size={14} fill={likedIds.has(song.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-surface-600 flex items-center justify-between px-1">
        <span>{filteredSongs.length} şarkı</span>
        <span>Sağ tık ile daha fazla seçenek</span>
      </div>

      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAddToPlaylist={() => setShowPlaylistModal(ctxMenu.song)} />}
      {showPlaylistModal && <AddToPlaylistModal song={showPlaylistModal} onClose={() => setShowPlaylistModal(null)} />}
    </div>
  )
}
