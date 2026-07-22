import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { Input } from '@/components/ui'
import { SongSkeleton } from '@/components/Skeleton'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import type { Song } from '@/types'
import { Play, Search as SearchIcon, X, Music, Users, ListMusic, Heart } from 'lucide-react'

export default function SearchPage() {
  const { searchQuery, setSearchQuery, songs, setSongs, setQueue, setCurrentSong, currentSong, user } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [songResults, setSongResults] = useState<Song[]>([])
  const [artistResults, setArtistResults] = useState<any[]>([])
  const [playlistResults, setPlaylistResults] = useState<any[]>([])
  const [userResults, setUserResults] = useState<any[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'all' | 'songs' | 'artists' | 'playlists'>('all')
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [addPlaylistSong, setAddPlaylistSong] = useState<Song | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
    fetchSongs(); fetchLikes()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!searchQuery.trim()) {
        setSongResults(songs)
        setArtistResults([])
        setPlaylistResults([])
        setUserResults([])
        return
      }
      const q = searchQuery.toLowerCase()
      setSongResults(songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)))
      fetchArtists(q)
      fetchPlaylists(q)
      fetchUsers(q)
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, songs])

  async function fetchSongs() {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').limit(100)
    if (data) setSongs(data)
    setLoading(false)
  }

  async function fetchLikes() {
    if (!user) return
    const { data } = await supabase.from('likes').select('song_id').eq('user_id', user.id)
    if (data) setLikedIds(new Set(data.map((l: any) => l.song_id)))
  }

  async function fetchArtists(q: string) {
    const { data } = await supabase.from('songs').select('artist').ilike('artist', `%${q}%`).limit(20)
    if (data) {
      const unique = Array.from(new Set(data.map((s: any) => s.artist))).slice(0, 10).map((name) => ({ name }))
      setArtistResults(unique)
    }
  }

  async function fetchPlaylists(q: string) {
    if (!user) return
    const { data } = await supabase.from('playlists').select('*').ilike('name', `%${q}%`).limit(10)
    if (data) setPlaylistResults(data)
  }

  async function fetchUsers(q: string) {
    const { data } = await supabase.from('users').select('*').ilike('username', `%${q}%`).limit(10)
    if (data) setUserResults(data)
  }

  const playSong = (song: Song) => { setQueue(songResults); setCurrentSong(song) }

  async function toggleLike(song: Song) {
    if (!user) return
    const isLiked = likedIds.has(song.id)
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', song.id)
      await supabase.from('songs').update({ likes_count: Math.max(0, (song.likes_count || 0) - 1) }).eq('id', song.id)
      likedIds.delete(song.id)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, song_id: song.id })
      await supabase.from('songs').update({ likes_count: (song.likes_count || 0) + 1 }).eq('id', song.id)
      likedIds.add(song.id)
    }
    setLikedIds(new Set(likedIds))
  }

  function handleContextMenu(e: React.MouseEvent, song: Song) {
    e.preventDefault()
    setCtxMenu({ song, x: e.clientX, y: e.clientY })
  }

  const hasQuery = searchQuery.trim().length > 0
  const showAll = tab === 'all'

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in" onContextMenu={(e) => { if (!(e.target as HTMLElement).closest('.song-row')) setCtxMenu(null) }}>
      <div className="relative mb-6 max-w-md">
        <SearchIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <Input
          placeholder="Şarkı, sanatçı, liste veya kullanıcı ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 pr-10 h-11"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="flex gap-4 mb-6 border-b border-surface-800/50">
          {(['all', 'songs', 'artists', 'playlists'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'text-wave-400 border-wave-400' : 'text-surface-500 hover:text-white border-transparent'}`}>
              {t === 'all' ? 'Tümü' : t === 'songs' ? 'Şarkılar' : t === 'artists' ? 'Sanatçılar' : 'Listeler'}
            </button>
          ))}
        </div>
      )}

      {userResults.length > 0 && (showAll || tab === 'artists') && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">Kullanıcılar</h2>
          <div className="flex flex-col gap-1">
            {userResults.map((u) => (
              <button key={u.id} onClick={() => navigate(`/profile/${u.id}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-sm font-bold text-white">{u.username?.[0]?.toUpperCase() || '?'}</div>
                <div><p className="text-sm font-medium text-white">{u.username}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {playlistResults.length > 0 && (showAll || tab === 'playlists') && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">Çalma Listeleri</h2>
          <div className="flex flex-col gap-1">
            {playlistResults.map((pl) => (
              <button key={pl.id} onClick={() => { useStore.getState().setActivePlaylist(pl); navigate('/playlist') }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
                <div className="w-9 h-9 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center"><ListMusic size={16} className="text-surface-400" /></div>
                <div><p className="text-sm font-medium text-white">{pl.name}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {artistResults.length > 0 && (showAll || tab === 'artists') && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">Sanatçılar</h2>
          {artistResults.map((a) => (
            <div key={a.name} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center text-sm font-bold text-white">{a.name?.[0]?.toUpperCase() || '?'}</div>
              <p className="text-sm font-medium text-white">{a.name}</p>
            </div>
          ))}
        </div>
      )}

      {loading && !hasQuery && (
        <div className="flex flex-col gap-1"><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>
      )}

      {songResults.length === 0 && hasQuery && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-surface-500"><SearchIcon size={40} className="mb-4 opacity-30" /><p className="text-sm">Sonuç bulunamadı</p></div>
      )}

      {songResults.length > 0 && !(tab === 'artists' || tab === 'playlists') && (
        <div>
          {showAll && <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">Şarkılar</h2>}
          <div className="flex flex-col gap-1">
            {songResults.map((song) => (
              <div key={song.id} className="song-row group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 card-hover" onClick={() => playSong(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                <div className="relative w-10 h-10 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
                      <Music size={16} className="text-surface-500" />
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
                <button onClick={(e) => { e.stopPropagation(); setAddPlaylistSong(song) }} className="p-1.5 rounded-lg text-surface-500 hover:text-wave-400 transition-colors opacity-0 group-hover:opacity-100">
                  <ListMusic size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleLike(song) }} className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${likedIds.has(song.id) ? 'text-red-400 opacity-100' : 'text-surface-500 hover:text-red-400'}`}>
                  <Heart size={14} fill={likedIds.has(song.id) ? 'currentColor' : 'none'} />
                </button>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} />}
      {addPlaylistSong && <AddToPlaylistModal song={addPlaylistSong} onClose={() => setAddPlaylistSong(null)} />}
    </div>
  )
}
