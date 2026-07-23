import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types'
import { Button, Input } from '@/components/ui'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { Play, Pause, Music, Clock, Flame, Heart, TrendingUp, AudioWaveform, Trash2, X, Users, Search, Plus, ListMusic } from 'lucide-react'
import { emitToast } from '@/hooks/useToast'

export default function PlaylistPage() {
  const navigate = useNavigate()
  const { activePlaylist, setQueue, setCurrentSong, currentSong, isPlaying, user } = useStore()
  const [songs, setSongs] = useState<Song[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [isCollab, setIsCollab] = useState(false)
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [showAddSong, setShowAddSong] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [addPlaylistSong, setAddPlaylistSong] = useState<Song | null>(null)

  useEffect(() => {
    if (!activePlaylist) return
    if (activePlaylist.type === 'auto') fetchAutoPlaylist(activePlaylist.auto_type!)
    else if (activePlaylist.type === 'custom') {
      fetchCustomPlaylist(activePlaylist.id)
      fetchCollaborators(activePlaylist.id)
    }
    fetchLikes()
  }, [activePlaylist])

  async function fetchAutoPlaylist(autoType: string) {
    if (autoType === 'liked') {
      if (!user) return
      const { data } = await supabase.from('likes').select('song_id').eq('user_id', user.id)
      if (data && data.length > 0) {
        const ids = data.map((l: any) => l.song_id)
        const { data: likedSongs } = await supabase.from('songs').select('*').in('id', ids)
        if (likedSongs) setSongs(likedSongs)
      } else {
        setSongs([])
      }
      return
    }
    let q = supabase.from('songs').select('*')
    if (autoType === 'latest') q = q.order('created_at', { ascending: false }).limit(50)
    else q = q.order('likes_count', { ascending: false }).limit(50)
    const { data } = await q
    if (data) setSongs(data)
  }

  async function fetchCustomPlaylist(playlistId: string) {
    const { data } = await supabase.from('playlist_songs').select('songs(*)').eq('playlist_id', playlistId).order('position', { ascending: true })
    if (data) setSongs(data.map((item: any) => item.songs).filter(Boolean))
  }

  async function fetchLikes() {
    if (!user) return
    const { data } = await supabase.from('likes').select('song_id').eq('user_id', user.id)
    if (data) setLikedIds(new Set(data.map((l: any) => l.song_id)))
  }

  async function removeFromPlaylist(songId: string) {
    if (!activePlaylist || activePlaylist.type !== 'custom') return
    await supabase.from('playlist_songs').delete().eq('playlist_id', activePlaylist.id).eq('song_id', songId)
    setSongs((prev) => prev.filter((s) => s.id !== songId))
  }

  async function deletePlaylist() {
    if (!activePlaylist || activePlaylist.type !== 'custom' || activePlaylist.user_id !== user?.id) return
    if (!confirm('Bu çalma listesini silmek istediğine emin misin?')) return
    await supabase.from('playlists').delete().eq('id', activePlaylist.id)
    emitToast('Liste silindi', 'info')
    navigate('/library')
  }

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
      supabase.from('activities').insert({ user_id: user.id, type: 'like', data: { song_id: song.id } }).select()
      likedIds.add(song.id)
    }
    setLikedIds(new Set(likedIds))
  }

  async function fetchCollaborators(playlistId: string) {
    const { data: pl } = await supabase.from('playlists').select('is_collaborative').eq('id', playlistId).single()
    if (pl) setIsCollab(!!pl.is_collaborative)
    const { data: collabs } = await supabase.from('playlist_collaborators').select('user:users(*)').eq('playlist_id', playlistId)
    if (collabs) setCollaborators(collabs.map((c: any) => c.user).filter(Boolean))
  }

  async function toggleCollaborative() {
    if (!activePlaylist || activePlaylist.type !== 'custom') return
    const newVal = !isCollab
    await supabase.from('playlists').update({ is_collaborative: newVal }).eq('id', activePlaylist.id)
    setIsCollab(newVal)
  }

  async function searchSongs(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    const { data } = await supabase.from('songs').select('*').or(`title.ilike.%${q}%,artist.ilike.%${q}%`).limit(20)
    if (data) setSearchResults(data)
  }

  async function addSongToPlaylist(song: Song) {
    if (!activePlaylist || activePlaylist.type !== 'custom') return
    const { data: posData } = await supabase.from('playlist_songs').select('position').eq('playlist_id', activePlaylist.id).order('position', { ascending: false }).limit(1)
    const position = (posData && posData.length > 0) ? posData[0].position + 1 : 0
    const { error } = await supabase.from('playlist_songs').insert({ playlist_id: activePlaylist.id, song_id: song.id, position })
    if (error) {
      if (error.code === '23505') emitToast('Zaten listede', 'info')
      else emitToast('Hata: ' + error.message, 'error')
    } else {
      emitToast('Listeye eklendi', 'success')
      setSongs(prev => [...prev, song])
    }
  }

  const playAll = () => { if (songs.length === 0) return; setQueue(songs); setCurrentSong(songs[0]) }
  const playSong = (song: Song) => { setQueue(songs); setCurrentSong(song) }

  const getIcon = () => {
    switch (activePlaylist?.auto_type) {
      case 'top50': return <Flame size={52} className="text-orange-400" />
      case 'weekly': return <TrendingUp size={52} className="text-purple-400" />
      case 'latest': return <Clock size={52} className="text-sky-400" />
      case 'liked': return <Heart size={52} className="text-emerald-400" />
      default: return <Music size={52} className="text-wave-400" />
    }
  }

  if (!activePlaylist) return (
    <div className="p-8 flex items-center justify-center h-full text-surface-500 animate-fade-in">
      <div className="text-center"><AudioWaveform size={48} className="mx-auto mb-4 opacity-30" /><p>Liste seçilmedi</p></div>
    </div>
  )

  const isCustom = activePlaylist.type === 'custom'

  return (
    <div className="overflow-y-auto h-full scrollbar-thin">
      <div className="bg-gradient-to-b from-surface-900 to-surface-950 p-8">
        <div className="flex items-end gap-6 mb-6">
          <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center shadow-2xl flex-shrink-0">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase font-semibold tracking-widest text-surface-500">{activePlaylist.type === 'auto' ? 'Otomatik Liste' : 'Çalma Listesi'}</p>
            <h1 className="text-4xl font-extrabold mt-2 mb-2">{activePlaylist.name}</h1>
            <p className="text-sm text-surface-400">{songs.length} şarkı</p>
            <div className="flex items-center gap-3 mt-4">
              <Button variant="primary" size="lg" onClick={playAll} disabled={songs.length === 0}><Play size={18} fill="white" /> Tümünü Oynat</Button>
              {isCustom && activePlaylist.user_id === user?.id && (
                <>
                  <button onClick={toggleCollaborative} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${isCollab ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>
                    <Users size={15} /> {isCollab ? 'İşbirlikçi' : 'Sadece Ben'}
                  </button>
                  <button onClick={deletePlaylist} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border bg-surface-800 text-red-400 border-surface-700 hover:bg-red-500/20 hover:border-red-500/30">
                    <Trash2 size={15} /> Listeyi Sil
                  </button>
                </>
              )}
            </div>
            {collaborators.length > 0 && (
              <div className="flex items-center gap-1 mt-3">
                <span className="text-xs text-surface-500 mr-2">Katkıda bulunanlar:</span>
                {collaborators.map((c: any) => (
                  <div key={c.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-[9px] font-bold text-white" title={c.username}>
                    {c.username?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-8 pb-8">
        {isCustom && activePlaylist.user_id === user?.id && (
          <div className="mb-4">
            {!showAddSong ? (
              <button onClick={() => setShowAddSong(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-wave-500/10 text-wave-400 border border-wave-500/20 hover:bg-wave-500/20 transition-all">
                <Plus size={15} /> Şarkı Ekle
              </button>
            ) : (
              <div className="glass rounded-2xl p-4 animate-fade-in">
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Şarkı veya sanatçı ara..."
                    value={searchQuery}
                    onChange={(e) => searchSongs(e.target.value)}
                    className="flex-1"
                  />
                  <button onClick={() => { setShowAddSong(false); setSearchQuery(''); setSearchResults([]) }} className="px-3 py-2 text-sm text-surface-400 hover:text-white">Kapat</button>
                </div>
                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto scrollbar-thin">
                    {searchResults.map((s) => (
                      <div key={s.id} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${songs.find(x => x.id === s.id) ? 'opacity-40' : 'hover:bg-white/5 cursor-pointer'}`} onClick={() => !songs.find(x => x.id === s.id) && addSongToPlaylist(s)}>
                        {s.cover_url ? <img src={s.cover_url} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center"><Music size={14} className="text-surface-500" /></div>}
                        <div className="flex-1 min-w-0"><p className="text-sm truncate">{s.title}</p><p className="text-xs text-surface-400 truncate">{s.artist}</p></div>
                        {songs.find(x => x.id === s.id) ? <span className="text-xs text-surface-500">Zaten var</span> : <Plus size={14} className="text-wave-400" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-surface-500"><p className="text-sm">Bu listede şarkı yok</p></div>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song, i) => (
              <div key={song.id} className="group flex items-center gap-3.5 p-2.5 rounded-xl transition-all duration-200 card-hover" onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ song, x: e.clientX, y: e.clientY }) }}>
                <div className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song)}>
                  <span className="w-6 text-xs text-surface-500 text-right tabular-nums group-hover:hidden">{i + 1}</span>
                  <button className="hidden group-hover:flex w-6 text-wave-400 items-center justify-center">{currentSong?.id === song.id && isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
                  {song.cover_url ? <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0"><Music size={16} className="text-surface-500" /></div>}
                  <div className="flex-1 min-w-0"><p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>{song.title}</p><p className="text-xs text-surface-400 truncate">{song.artist}</p></div>
                  <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setAddPlaylistSong(song) }} className="p-1.5 rounded-lg text-surface-500 hover:text-wave-400 transition-colors" title="Listeye Ekle">
                    <ListMusic size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(song) }} className={`p-1.5 rounded-lg transition-colors ${likedIds.has(song.id) ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
                    <Heart size={14} fill={likedIds.has(song.id) ? 'currentColor' : 'none'} />
                  </button>
                  {isCustom && (
                    <button onClick={(e) => { e.stopPropagation(); removeFromPlaylist(song.id) }} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAddToPlaylist={() => setAddPlaylistSong(ctxMenu.song)} />}
      {addPlaylistSong && <AddToPlaylistModal song={addPlaylistSong} onClose={() => setAddPlaylistSong(null)} />}
    </div>
  )
}
