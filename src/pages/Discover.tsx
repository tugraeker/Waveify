import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types'
import { Play, Pause, Music2, TrendingUp, Clock, Heart, Radio, Sparkles } from 'lucide-react'

const moodStations = [
  { id: 'energetic', label: 'Enerjik', icon: '🔥', genres: ['rock', 'pop', 'electronic'] },
  { id: 'chill', label: 'Sakin', icon: '🌊', genres: ['ambient', 'lofi', 'jazz'] },
  { id: 'focus', label: 'Odaklanma', icon: '🎯', genres: ['classical', 'instrumental', 'ambient'] },
  { id: 'workout', label: 'Spor', icon: '💪', genres: ['rock', 'electronic', 'hip-hop'] },
  { id: 'night', label: 'Gece', icon: '🌙', genres: ['ambient', 'lofi', 'r&b'] },
  { id: 'party', label: 'Parti', icon: '🎉', genres: ['pop', 'electronic', 'hip-hop'] },
]

export default function Discover() {
  const navigate = useNavigate()
  const { setCurrentSong, setQueue, currentSong, isPlaying } = useStore()
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([])
  const [genreSongs, setGenreSongs] = useState<Record<string, Song[]>>({})

  useEffect(() => {
    fetchRecent()
    fetchTrending()
    fetchGenreSongs()
  }, [])

  async function fetchRecent() {
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(10)
    if (data) setRecentSongs(data)
  }

  async function fetchTrending() {
    const { data } = await supabase.from('songs').select('*').order('likes_count', { ascending: false }).limit(10)
    if (data) setTrendingSongs(data)
  }

  async function fetchGenreSongs() {
    const allGenres = [...new Set(moodStations.flatMap(m => m.genres))]
    const results: Record<string, Song[]> = {}
    for (const genre of allGenres) {
      const { data } = await supabase.from('songs').select('*').ilike('genre', `%${genre}%`).order('likes_count', { ascending: false }).limit(5)
      if (data && data.length > 0) results[genre] = data
    }
    setGenreSongs(results)
  }

  const playSong = (song: Song, list: Song[]) => {
    setQueue(list)
    setCurrentSong(song)
  }

  const playStation = (station: typeof moodStations[0]) => {
    const stationSongs = station.genres.flatMap(g => genreSongs[g] || [])
    const unique = stationSongs.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
    if (unique.length > 0) {
      setQueue(unique)
      setCurrentSong(unique[0])
    }
  }

  function SongList({ songs, title, icon: Icon }: { songs: Song[]; title: string; icon: any }) {
    if (songs.length === 0) return null
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Icon size={18} className="text-wave-400" />
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {songs.map((song) => (
            <div key={song.id} onClick={() => playSong(song, songs)} className="flex-shrink-0 w-44 bg-surface-900/60 rounded-2xl p-3 border border-surface-800/50 hover:bg-surface-800/60 cursor-pointer transition-all group">
              {song.cover_url ? (
                <img src={song.cover_url} alt="" className="w-full aspect-square rounded-xl object-cover mb-3 shadow-lg" />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700 flex items-center justify-center mb-3">
                  <Music2 size={28} className="text-surface-500" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                <button className="ml-2 opacity-0 group-hover:opacity-100 bg-wave-500 text-white rounded-full p-1.5 shadow-lg transition-all">
                  {currentSong?.id === song.id && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin animate-fade-in space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={24} className="text-wave-400" />
        <h1 className="text-2xl font-bold">Keşfet</h1>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Radio size={18} className="text-wave-400" />
          <h2 className="text-lg font-bold">Radyo İstasyonları</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {moodStations.map((station) => (
            <button
              key={station.id}
              onClick={() => playStation(station)}
              className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-4 hover:bg-surface-800/60 hover:border-wave-400/20 transition-all text-center group"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{station.icon}</span>
              <span className="text-sm font-medium text-white">{station.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SongList songs={trendingSongs} title="Popüler" icon={TrendingUp} />
      <SongList songs={recentSongs} title="En Son Yüklenenler" icon={Clock} />
    </div>
  )
}