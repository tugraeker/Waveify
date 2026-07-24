import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui'
import type { Song } from '@/types'
import { ArrowLeft, Play, Pause, Music2 } from 'lucide-react'

export default function ArtistPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { setCurrentSong, setQueue, currentSong, isPlaying } = useStore()
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => {
    if (!name) return
    supabase.from('songs').select('*').eq('artist', decodeURIComponent(name)).order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setSongs(data)
    })
  }, [name])

  const playAll = () => {
    if (songs.length === 0) return
    setQueue(songs)
    setCurrentSong(songs[0])
  }

  const playSong = (song: Song) => {
    setQueue(songs)
    setCurrentSong(song)
  }

  const artistName = name ? decodeURIComponent(name) : ''

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="bg-gradient-to-b from-surface-900 to-surface-950 p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-surface-400 hover:text-white mb-6">
          <ArrowLeft size={18} /> Geri
        </button>
        <div className="flex items-end gap-6">
          <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-wave-500/20 to-purple-600/20 border border-surface-700 flex items-center justify-center shadow-2xl">
            <Music2 size={56} className="text-wave-400" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold tracking-widest text-surface-500">Sanatçı</p>
            <h1 className="text-4xl font-extrabold mt-1">{artistName}</h1>
            <p className="text-sm text-surface-400 mt-1">{songs.length} şarkı</p>
            <div className="mt-4">
              <Button variant="primary" size="lg" onClick={playAll} disabled={songs.length === 0}>
                <Play size={18} fill="white" /> Tümünü Oynat
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        {songs.length === 0 ? (
          <p className="text-surface-500 text-sm">Bu sanatçıya ait şarkı bulunamadı</p>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song) => (
              <div key={song.id} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all" onClick={() => playSong(song)}>
                <span className="w-6 text-xs text-surface-500 text-right tabular-nums group-hover:hidden">{songs.indexOf(song) + 1}</span>
                <button className="hidden group-hover:flex w-6 text-wave-400 items-center justify-center">
                  {currentSong?.id === song.id && isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                </button>
                {song.cover_url ? (
                  <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                    <Music2 size={16} className="text-surface-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>{song.title}</p>
                  <p className="text-xs text-surface-400">{song.album || song.genre || ''}</p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}