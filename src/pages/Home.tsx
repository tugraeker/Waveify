import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { SongSkeleton, CardSkeleton } from '@/components/Skeleton'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import type { Song } from '@/types'
import { Flame, TrendingUp, Clock, Heart, Music, Play, AudioWaveform, ListMusic } from 'lucide-react'

const autoPlaylistDefs = [
  { name: 'En Çok Dinlenenler', icon: Flame, auto_type: 'top50', gradient: 'from-rose-600 to-orange-600' },
  { name: 'Bu Hafta Popüler', icon: TrendingUp, auto_type: 'weekly', gradient: 'from-violet-600 to-pink-600' },
  { name: 'En Son Yüklenenler', icon: Clock, auto_type: 'latest', gradient: 'from-sky-600 to-cyan-600' },
  { name: 'Beğenilenler', icon: Heart, auto_type: 'liked', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Arkadaşlarının En Çok Dinledikleri', icon: Music, auto_type: 'friends_top', gradient: 'from-amber-600 to-yellow-600' },
]

export default function Home() {
  const { songs, setSongs, setActivePlaylist, setQueue, setCurrentSong, currentSong, isPlaying } = useStore()
  const navigate = useNavigate()
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [addPlaylistSong, setAddPlaylistSong] = useState<Song | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Günaydın')
    else if (h < 18) setGreeting('İyi Günler')
    else setGreeting('İyi Akşamlar')
    fetchSongs()
  }, [])

  async function fetchSongs() {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) { setSongs(data); setRecentSongs(data.slice(0, 6)) }
    setLoading(false)
  }

  const playSong = (song: Song) => {
    setQueue(songs); setCurrentSong(song)
  }

  function handleContextMenu(e: React.MouseEvent, song: Song) {
    e.preventDefault()
    setCtxMenu({ song, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">{greeting}</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-5 text-surface-200">Otomatik Listeler</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {autoPlaylistDefs.map(({ name, icon: Icon, auto_type, gradient }) => (
              <button
                key={auto_type}
                onClick={() => {
                  setActivePlaylist({ id: auto_type, name, user_id: '', type: 'auto', auto_type: auto_type as any, created_at: '' })
                  navigate('/playlist')
                }}
                className="group relative overflow-hidden rounded-2xl aspect-square p-5 flex flex-col justify-end items-start transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <Icon size={30} className="text-white/90 mb-2 relative z-10" />
                <span className="text-sm font-bold text-white relative z-10 leading-tight">{name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-200">En Son Yüklenenler</h2>
          <button onClick={() => navigate('/library')} className="text-xs text-surface-400 hover:text-wave-400 transition-colors font-medium">Tümünü Gör</button>
        </div>
        {loading ? (
          <div className="flex flex-col gap-1">{Array.from({ length: 5 }).map((_, i) => <SongSkeleton key={i} />)}</div>
        ) : recentSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-surface-500">
            <AudioWaveform size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">Henüz şarkı yok</p>
            <button onClick={() => navigate('/upload')} className="text-wave-400 hover:underline text-xs mt-2">İlk şarkını yükle</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {recentSongs.map((song) => (
              <div
                key={song.id}
                className="song-row group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 card-hover"
                onClick={() => playSong(song)}
                onContextMenu={(e) => handleContextMenu(e, song)}
              >
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
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAddToPlaylist={() => setAddPlaylistSong(ctxMenu.song)} />}
      {addPlaylistSong && <AddToPlaylistModal song={addPlaylistSong} onClose={() => setAddPlaylistSong(null)} />}
    </div>
  )
}
