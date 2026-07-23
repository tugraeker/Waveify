import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { SongSkeleton } from '@/components/Skeleton'
import { emitToast } from '@/hooks/useToast'
import type { Song } from '@/types'
import { Play, Music, AudioWaveform, Heart, Plus, ListMusic, SlidersHorizontal } from 'lucide-react'

export default function Library() {
  const { songs, setSongs, setQueue, setCurrentSong, currentSong, user, addToQueue } = useStore()
  const navigate = useNavigate()
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [showPlaylistModal, setShowPlaylistModal] = useState<Song | null>(null)
  const [filterText, setFilterText] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterArtist, setFilterArtist] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)

  const genres = [...new Set(songs.map((s) => s.genre).filter(Boolean))]
  const artists = [...new Set(songs.map((s) => s.artist).filter(Boolean))]
  const filteredSongs = songs.filter((s) => {
    if (filterText && !s.title.toLowerCase().includes(filterText.toLowerCase()) && !s.artist.toLowerCase().includes(filterText.toLowerCase())) return false
    if (filterGenre && s.genre !== filterGenre) return false
    if (filterArtist && s.artist !== filterArtist) return false
    return true
  })

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
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', song.id)
      await supabase.from('songs').update({ likes_count: Math.max(0, (song.likes_count || 0) - 1) }).eq('id', song.id)
      likedIds.delete(song.id)
      emitToast('Beğeni kaldırıldı', 'info')
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: song.id })
      await supabase.from('songs').update({ likes_count: (song.likes_count || 0) + 1 }).eq('id', song.id)
      likedIds.add(song.id)
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
        <h1 className="text-2xl font-bold">Kitaplık</h1>
        <button onClick={() => setShowFilters(!showFilters)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${showFilters || filterText || filterGenre || filterArtist ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-500 hover:text-white border border-transparent'}`}>
          <SlidersHorizontal size={13} /> Filtrele
        </button>
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
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-1"><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>
      ) : filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-surface-500">
          <AudioWaveform size={56} className="mb-5 opacity-30" />
          <p className="text-base font-medium text-surface-400">Henüz şarkı yok</p>
          <p className="text-sm mt-1 text-surface-500">Şarkı yüklemek için "Yükle" bölümüne gidin</p>
          <button onClick={() => navigate('/upload')} className="mt-4 text-sm text-wave-400 hover:text-wave-300 font-medium transition-colors">Şarkı Yükle</button>
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
