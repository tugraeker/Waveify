import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Play, Pause, Search, Download, Bookmark, Clock, Headphones, Filter, ChevronDown, Music, Plus, Check } from 'lucide-react'

const PODCAST_CATEGORIES = ['Teknoloji', 'Müzik', 'Eğitim', 'Haber', 'Spor', 'Sanat', 'Bilim', 'Komedi', 'Sağlık', 'Tarih']
const PODCASTS = Array.from({ length: 20 }, (_, i) => ({
  id: `podcast_${i}`,
  title: `Podcast ${i + 1}`,
  author: `Yazar ${i + 1}`,
  category: PODCAST_CATEGORIES[i % PODCAST_CATEGORIES.length],
  cover_url: '',
  episode_count: Math.floor(Math.random() * 50) + 5,
  description: `Podcast ${i + 1} açıklaması. İlginç konular ve keyifli sohbetler.`,
}))

export default function PodcastPage() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [subscribed, setSubscribed] = useState<string[]>(JSON.parse(localStorage.getItem('waveify_podcast_subs') || '[]'))
  const [favourites, setFavourites] = useState<string[]>(JSON.parse(localStorage.getItem('waveify_podcast_favs') || '[]'))

  const filtered = PODCASTS.filter(p =>
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase())) &&
    (!category || p.category === category)
  )

  function toggleSubscribe(id: string) {
    const next = subscribed.includes(id) ? subscribed.filter(s => s !== id) : [...subscribed, id]
    setSubscribed(next)
    localStorage.setItem('waveify_podcast_subs', JSON.stringify(next))
  }

  function toggleFavourite(id: string) {
    const next = favourites.includes(id) ? favourites.filter(f => f !== id) : [...favourites, id]
    setFavourites(next)
    localStorage.setItem('waveify_podcast_favs', JSON.stringify(next))
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Headphones size={24} className="text-wave-400" />
        <h1 className="text-2xl font-display font-bold">Podcast'ler</h1>
      </div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Podcast ara..." className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 pl-9 pr-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white">
          <option value="">Tüm Kategoriler</option>
          {PODCAST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-surface-900/50 border border-surface-800/50 rounded-2xl p-4 hover:border-surface-700 transition-all group">
            <div className="relative mb-3">
              <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-wave-500/20 to-purple-600/20 flex items-center justify-center">
                <Headphones size={40} className="text-surface-500" />
              </div>
              <button onClick={() => toggleFavourite(p.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-surface-300 hover:text-yellow-400 transition-colors">
                <Bookmark size={14} fill={favourites.includes(p.id) ? '#fbbf24' : 'none'} />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-white truncate">{p.title}</h3>
            <p className="text-xs text-surface-400 truncate">{p.author}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-400">{p.category}</span>
              <span className="text-[10px] text-surface-500">{p.episode_count} bölüm</span>
            </div>
            <p className="text-[11px] text-surface-500 mt-2 line-clamp-2">{p.description}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => toggleSubscribe(p.id)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${subscribed.includes(p.id) ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'bg-surface-800 text-surface-300 hover:text-white border border-surface-700'}`}>
                {subscribed.includes(p.id) ? <><Check size={12} className="inline mr-1" />Abone</> : <><Plus size={12} className="inline mr-1" />Abone Ol</>}
              </button>
              <button className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-white border border-surface-700 transition-colors">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
