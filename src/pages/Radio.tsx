import { useState, useEffect } from 'react'
import { Play, Pause, Search, Radio as RadioIcon, Heart, Music, Globe } from 'lucide-react'

const RADIO_STATIONS = [
  { id: 'r1', name: 'Waveify FM', genre: 'Pop', country: 'Türkiye', url: 'https://example.com/stream1', listeners: 1234 },
  { id: 'r2', name: 'Rock Radyo', genre: 'Rock', country: 'Türkiye', url: 'https://example.com/stream2', listeners: 856 },
  { id: 'r3', name: 'Jazz FM', genre: 'Caz', country: 'ABD', url: 'https://example.com/stream3', listeners: 2341 },
  { id: 'r4', name: 'Elektronik', genre: 'Elektronik', country: 'Almanya', url: 'https://example.com/stream4', listeners: 1567 },
  { id: 'r5', name: 'Klasik Radyo', genre: 'Klasik', country: 'İtalya', url: 'https://example.com/stream5', listeners: 923 },
  { id: 'r6', name: 'Hip Hop Radyo', genre: 'Hip Hop', country: 'ABD', url: 'https://example.com/stream6', listeners: 3120 },
  { id: 'r7', name: 'Türk Pop', genre: 'Pop', country: 'Türkiye', url: 'https://example.com/stream7', listeners: 2456 },
  { id: 'r8', name: 'LoFi Çalışma', genre: 'LoFi', country: 'Japonya', url: 'https://example.com/stream8', listeners: 5678 },
]

const GENRES = [...new Set(RADIO_STATIONS.map(s => s.genre))]
const COUNTRIES = [...new Set(RADIO_STATIONS.map(s => s.country))]

export default function RadioPage() {
  const [currentStation, setCurrentStation] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [favourites, setFavourites] = useState<string[]>(JSON.parse(localStorage.getItem('waveify_radio_favs') || '[]'))

  const filtered = RADIO_STATIONS.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.genre.toLowerCase().includes(search.toLowerCase())) &&
    (!genreFilter || s.genre === genreFilter) &&
    (!countryFilter || s.country === countryFilter)
  )

  function togglePlay(id: string) {
    if (currentStation === id) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentStation(id)
      setIsPlaying(true)
    }
  }

  function toggleFavourite(id: string) {
    const next = favourites.includes(id) ? favourites.filter(f => f !== id) : [...favourites, id]
    setFavourites(next)
    localStorage.setItem('waveify_radio_favs', JSON.stringify(next))
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <RadioIcon size={24} className="text-wave-400" />
        <h1 className="text-2xl font-display font-bold">Radyo</h1>
      </div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Radyo ara..." className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 pl-9 pr-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
        </div>
        <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} className="h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white">
          <option value="">Tüm Türler</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white">
          <option value="">Tüm Ülkeler</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(s => (
          <div key={s.id} className={`glass rounded-xl p-4 border transition-all ${currentStation === s.id && isPlaying ? 'border-wave-500/30 bg-wave-500/5' : 'border-surface-800/50 hover:border-surface-700'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => togglePlay(s.id)} className={`p-3 rounded-full transition-all ${currentStation === s.id && isPlaying ? 'bg-wave-500 text-white' : 'bg-surface-800 text-surface-400 hover:text-white'}`}>
                {currentStation === s.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  {currentStation === s.id && isPlaying && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-400 mt-0.5">
                  <Music size={10} /> {s.genre}
                  <Globe size={10} /> {s.country}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-surface-500">{s.listeners.toLocaleString()} 🎧</span>
                <button onClick={() => toggleFavourite(s.id)} className="p-1 text-surface-500 hover:text-red-400 transition-colors">
                  <Heart size={14} fill={favourites.includes(s.id) ? '#ef4444' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
