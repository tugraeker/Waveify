import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { BarChart3, Clock, Music, Heart, TrendingUp, Play, Flame, Sun, Moon, CalendarDays } from 'lucide-react'

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
    todayPlays: 0,
    hourlyActivity: [] as { hour: number; count: number }[],
    monthHeatmap: [] as { date: string; count: number }[],
    totalHours: 0,
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

      if (history) {
        const uniqueSongs = new Set(history.map((h: any) => h.song_id))
        const totalDuration = history.reduce((sum: number, h: any) => sum + (h.song?.duration || 0), 0)
        const genreCount: Record<string, number> = {}
        const artistCount: Record<string, number> = {}
        const songCount: Record<string, number> = {}
        const dayCount: Record<string, number> = {}
        const hourCount: number[] = new Array(24).fill(0)
        const monthDays: Record<string, number> = {}
        let todayPlays = 0
        const todayStr = new Date().toISOString().split('T')[0]

        history.forEach((h: any) => {
          if (h.song?.genre) genreCount[h.song.genre] = (genreCount[h.song.genre] || 0) + 1
          if (h.song?.artist) artistCount[h.song.artist] = (artistCount[h.song.artist] || 0) + 1
          songCount[h.song_id] = (songCount[h.song_id] || 0) + 1
          const day = h.played_at?.split('T')[0]
          if (day) {
            dayCount[day] = (dayCount[day] || 0) + 1
            monthDays[day] = (monthDays[day] || 0) + 1
            if (day === todayStr) todayPlays++
          }
          const hour = new Date(h.played_at).getHours()
          if (!isNaN(hour)) hourCount[hour]++
        })

        const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
        const sortedArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
        const sortedSongs = Object.entries(songCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count, song: history.find((h: any) => h.song_id === id)?.song }))
        const sortedDays = Object.entries(dayCount).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, count]) => ({ date, count }))
        const hourlyData = hourCount.map((count, hour) => ({ hour, count }))

        // Generate last 12 weeks of heatmap data
        const heatmap: Record<string, number> = {}
        for (let i = 0; i < 84; i++) {
          const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
          heatmap[d] = monthDays[d] || 0
        }
        const monthHeatmap = Object.entries(heatmap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }))

        let streak = 0
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
          todayPlays,
          hourlyActivity: hourlyData,
          monthHeatmap,
          totalHours: Math.round(totalDuration / 3600),
        })
      }
    } catch (e) {
      console.error('Stats error:', e)
    } finally {
      setLoading(false)
    }
  }

  const genreColors = ['#22c7c0', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6']

  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-8">İstatistikler</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Toplam Dinleme', value: stats.totalPlays, icon: Play, color: 'text-wave-400' },
          { label: 'Dinleme Süresi', value: stats.totalHours + ' saat', icon: Clock, color: 'text-blue-400' },
          { label: 'Bugün', value: stats.todayPlays, icon: Sun, color: 'text-amber-400' },
          { label: 'Farklı Şarkı', value: stats.uniqueSongs, icon: Music, color: 'text-purple-400' },
          { label: 'Seri Gün', value: `${stats.listeningStreak} gün`, icon: Flame, color: 'text-orange-400' },
        ].map((item) => (
          <div key={item.label} className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon size={14} className={item.color} />
              <span className="text-[11px] text-surface-500">{item.label}</span>
            </div>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Activity heatmap */}
      {stats.monthHeatmap.length > 0 && (
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2"><CalendarDays size={14} /> Son 12 Hafta</h3>
          <div className="flex flex-wrap gap-[3px]">
            {stats.monthHeatmap.map((d) => {
              const intensity = d.count === 0 ? 'bg-surface-800' : d.count <= 2 ? 'bg-wave-500/30' : d.count <= 5 ? 'bg-wave-500/50' : d.count <= 10 ? 'bg-wave-500/70' : 'bg-wave-500'
              return <div key={d.date} className={`w-3 h-3 rounded-sm ${intensity}`} title={`${d.date}: ${d.count} dinleme`} />
            })}
          </div>
        </div>
      )}

      {/* Hourly activity */}
      {stats.hourlyActivity.some(h => h.count > 0) && (
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
            <Clock size={14} /> Aktif Saatler
          </h3>
          <div className="flex items-end gap-1 h-24">
            {stats.hourlyActivity.map((h) => {
              const maxCount = Math.max(...stats.hourlyActivity.map(x => x.count), 1)
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="w-full rounded-sm bg-wave-400/50 transition-all hover:bg-wave-400/80"
                    style={{ height: `${Math.max((h.count / maxCount) * 100, 3)}%` }}
                    title={`${h.hour}:00 - ${h.count}`} />
                  {h.hour % 4 === 0 && <span className="text-[8px] text-surface-600">{h.hour}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: genreColors[i] || '#22c7c0' }} />
                  <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (g.count / stats.topGenres[0].count) * 100)}%`, backgroundColor: genreColors[i] || '#22c7c0' }} />
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