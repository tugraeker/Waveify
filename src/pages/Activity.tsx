import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Activity } from '@/types'
import { Music, Heart, PlusCircle, UserPlus, Globe, Play, Activity as ActivityIcon, Search, Filter, ChevronDown } from 'lucide-react'

const ACTIVITY_TYPES = ['all', 'listen', 'like', 'playlist_add', 'follow', 'import'] as const

export default function ActivityPage() {
  const { user, setCurrentSong, setQueue } = useStore()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const PAGE_SIZE = 20

  useEffect(() => {
    if (!user) return
    fetchActivities(true)
  }, [user])

  async function fetchActivities(reset = false) {
    if (reset) { setPage(1); setActivities([]) }
    setLoading(true)
    try {
      const { data: friendIds } = await supabase.from('friends').select('friend_id').eq('user_id', user!.id).eq('status', 'accepted')
      const ids = friendIds?.map((f: any) => f.friend_id) || []
      ids.push(user!.id)
      const currentPage = reset ? 1 : page
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data: actData } = await supabase
        .from('activities')
        .select('*, user:users(*)')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (actData) {
        const songIds = actData.filter((a: any) => a.song_id).map((a: any) => a.song_id).filter(Boolean)
        const songs: Record<string, any> = {}
        if (songIds.length > 0) {
          const { data: songData } = await supabase.from('songs').select('*').in('id', songIds)
          if (songData) songData.forEach((s: any) => songs[s.id] = s)
        }
        const enriched = actData.map((a: any) => ({ ...a, song: songs[a.song_id] || null }))
        setActivities(prev => reset ? enriched : [...prev, ...enriched])
        setHasMore(actData.length === PAGE_SIZE)
      }
    } catch {} finally { setLoading(false) }
  }

  const filteredActivities = useMemo(() => {
    let result = activities
    if (filterType !== 'all') result = result.filter(a => a.type === filterType)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.user?.username?.toLowerCase().includes(q) ||
        a.song?.title?.toLowerCase().includes(q) ||
        a.song?.artist?.toLowerCase().includes(q)
      )
    }
    return result
  }, [activities, filterType, searchQuery])

  function playSong(song: any) {
    if (!song) return
    setQueue([song])
    setCurrentSong(song)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'listen': return <Play size={14} className="text-wave-400" />
      case 'like': return <Heart size={14} className="text-red-400" />
      case 'playlist_add': return <PlusCircle size={14} className="text-green-400" />
      case 'follow': return <UserPlus size={14} className="text-blue-400" />
      case 'import': return <Globe size={14} className="text-orange-400" />
      default: return <ActivityIcon size={14} className="text-surface-400" />
    }
  }

  const getText = (a: Activity) => {
    switch (a.type) {
      case 'listen': return `${a.user?.username || 'Birisi'} dinliyor:`
      case 'like': return `${a.user?.username || 'Birisi'} beğendi:`
      case 'playlist_add': return `Listeye eklendi:`
      case 'follow': return `${a.user?.username || 'Birisi'} takip etti`
      case 'import': return `${a.user?.username || 'Birisi'} içe aktardı:`
      default: return ''
    }
  }

  const typeLabels: Record<string, string> = { all: 'Hepsi', listen: 'Dinleme', like: 'Beğeni', playlist_add: 'Liste', follow: 'Takip', import: 'İçe Aktarma' }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aktivite</h1>
        <button onClick={() => fetchActivities(true)} className="text-xs text-surface-500 hover:text-white transition-colors">Yenile</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı veya şarkı ara..." className="w-full h-9 rounded-xl bg-surface-800 border border-surface-700 pl-9 pr-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
        </div>
        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)} className="h-9 px-3 rounded-xl bg-surface-800 border border-surface-700 text-xs text-surface-300 hover:text-white flex items-center gap-1.5 transition-colors">
            <Filter size={13} /> {typeLabels[filterType]} <ChevronDown size={11} />
          </button>
          {showFilter && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-surface-800 border border-surface-700 rounded-xl py-1 shadow-2xl animate-fade-in z-10" onMouseLeave={() => setShowFilter(false)}>
              {ACTIVITY_TYPES.map(t => (
                <button key={t} onClick={() => { setFilterType(t); setShowFilter(false) }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${filterType === t ? 'text-wave-400 bg-wave-500/10' : 'text-surface-300 hover:text-white hover:bg-white/5'}`}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-surface-500"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-surface-500">
          <ActivityIcon size={48} className="mb-4 opacity-30" />
          <p className="text-sm">Henüz aktivite yok</p>
          <p className="text-xs mt-1">Arkadaşların bir şey yapınca burada görünecek</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-900/40 border border-surface-800/30">
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-sm font-bold text-white cursor-pointer flex-shrink-0"
                onClick={() => navigate(`/profile/${a.user_id}`)}
              >
                {a.user?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-500">{getText(a)}</p>
                {a.song ? (
                  <div className="flex items-center gap-2 mt-1 cursor-pointer group" onClick={() => playSong(a.song)}>
                    <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {a.song.cover_url ? <img src={a.song.cover_url} alt="" className="w-full h-full object-cover" /> : <Music size={12} className="text-surface-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-wave-400 transition-colors">{a.song.title}</p>
                      <p className="text-xs text-surface-400 truncate">{a.song.artist}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-surface-400 mt-1">{a.data?.song_id || ''}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getIcon(a.type)}
                <span className="text-[10px] text-surface-600 flex-shrink-0">{new Date(a.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {hasMore && (
            <button onClick={() => { setPage(p => p + 1); setTimeout(() => fetchActivities(), 0) }} disabled={loading}
              className="w-full py-3 text-xs text-surface-500 hover:text-wave-400 transition-colors border border-dashed border-surface-800 rounded-xl">
              {loading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
