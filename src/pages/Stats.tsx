import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { BarChart3, Clock, Music, Heart, TrendingUp, Play, Flame } from 'lucide-react'

export default function Stats() {
  const { user } = useStore()
  const [stats, setStats] = useState({
    totalPlays: 0,
    totalDuration: 0,
    uniqueSongs: 0,
    likesGiven: 0,
    topGenres: [] as { name: string; count: number }[],
    topArtists: [] as { name: string; count: number }[],
    topSongs: [] as any[],
    dailyPlays: [] as { date: string; count: number }[],
    listeningStreak: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  async function fetchStats() {
    setLoading(true)
    try {
      const { data: history } = await supabase
        .from('listen_history')
        .select('*, song:songs(*)')
        .eq('user_id', user!.id)
        .order('played_at', { ascending: false })

      const { count: likesGiven } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user!.id)

      const { data: songs } = await supabase.from('songs').select('*').eq('user_id', user!.id)
      const userSongs = songs || []

      if (history) {
        const uniqueSongs = new Set(history.map((h: any) => h.song_id))
        const totalDuration = history.reduce((sum: number, h: any) => sum + (h.song?.duration || 0), 0)
        const genreCount: Record<string, number> = {}
        const artistCount: Record<string, number> = {}
        const songCount: Record<string, number> = {}
        const dayCount: Record<string, number> = {}

        history.forEach((h: any) => {
          if (h.song?.genre) genreCount[h.song.genre] = (genreCount[h.song.genre] || 0) + 1
          if (h.song?.artist) artistCount[h.song.artist] = (artistCount[h.song.artist] || 0) + 1
          songCount[h.song_id] = (songCount[h.song_id] || 0) + 1
          const day = h.played_at?.split('T')[0]
          if (day) dayCount[day] = (dayCount[day] || 0) + 1
        })

        const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
        const sortedArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
        const sortedSongs = Object.entries(songCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count, song: history.find((h: any) => h.song_id === id)?.song }))
        const sortedDays = Object.entries(dayCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, count]) => ({ date, count }))

        let streak = 0
        const today = new Date().toISOString().split('T')[0]
        for (let i = 0; i < 365; i++) {
          const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
          if (dayCount[d]) streak++
          else if (i > 0) break
        }

        setStats({
          totalPlays: history.length,
          totalDuration,
          uniqueSongs: uniqueSongs.size,
          likesGiven: likesGiven || 0,
          topGenres: sortedGenres,
          topArtists: sortedArtists,
          topSongs: sortedSongs,
          dailyPlays: sortedDays,
          listeningStreak: streak,
        })
      }
    } catch (e) {
      console.error('Stats error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-2xl font-bold mb-8">İstatistikler</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Toplam Dinleme', value: stats.totalPlays, icon: Play, color: 'text-wave-400' },
          { label: 'Dinleme Süresi', value: formatDuration(stats.totalDuration), icon: Clock, color: 'text-blue-400' },
          { label: 'Farklı Şarkı', value: stats.uniqueSongs, icon: Music, color: 'text-purple-400' },
          { label: 'Seri Gün', value: `${stats.listeningStreak} gün`, icon: Flame, color: 'text-orange-400' },
        ].map((item) => (
          <div key={item.label} className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <item.icon size={16} className={item.color} />
              <span className="text-xs text-surface-500">{item.label}</span>
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">En Çok Dinlenen Sanatçılar</h3>
          {stats.topArtists.length === 0 ? <p className="text-sm text-surface-500">Veri yok</p> : (
            <div className="flex flex-col gap-2">
              {stats.topArtists.map((a, i) => (
                <div key={a.name} className="flex items-center gap-3">
                  <span className="text-xs text-surface-600 w-5">{i + 1}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div className="h-full rounded-full bg-wave-400/60" style={{ width: `${Math.min(100, (a.count / stats.topArtists[0].count) * 100)}%` }} />
                  </div>
                  <span className="text-sm text-white min-w-0 truncate flex-1">{a.name}</span>
                  <span className="text-xs text-surface-500">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">En Çok Dinlenen Türler</h3>
          {stats.topGenres.length === 0 ? <p className="text-sm text-surface-500">Veri yok</p> : (
            <div className="flex flex-col gap-2">
              {stats.topGenres.map((g, i) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="text-xs text-surface-600 w-5">{i + 1}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400/60" style={{ width: `${Math.min(100, (g.count / stats.topGenres[0].count) * 100)}%` }} />
                  </div>
                  <span className="text-sm text-white min-w-0 truncate flex-1">{g.name}</span>
                  <span className="text-xs text-surface-500">{g.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats.dailyPlays.length > 0 && (
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 mt-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Son 14 Gün</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyPlays.map((d) => {
              const maxCount = Math.max(...stats.dailyPlays.map((x) => x.count), 1)
              const h = (d.count / maxCount) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-surface-500">{d.count}</span>
                  <div className="w-full rounded-md bg-wave-400/60 transition-all" style={{ height: `${Math.max(h, 4)}%` }} />
                  <span className="text-[9px] text-surface-600">{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
