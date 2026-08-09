import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { formatDuration } from '@/lib/utils'
import { Trophy, Crown, Medal, Music2, TrendingUp, Heart, Play } from 'lucide-react'
import type { Song } from '@/types'

interface LeaderEntry {
  user_id: string
  username: string
  avatar_url: string
  count: number
}

export default function Charts() {
  const { togglePlay, isPlaying } = useAudio()
  const { user, setQueue, setCurrentSong, currentSong } = useStore()
  const [weekly, setWeekly] = useState<Song[]>([])
  const [weeklyCounts, setWeeklyCounts] = useState<Map<string, number>>(new Map())
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'songs' | 'listeners'>('songs')

  useEffect(() => {
    ;(async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      try {
        const { data: likeRows } = await supabase
          .from('likes')
          .select('song_id, created_at')
          .gte('created_at', weekAgo)
        const counts = new Map<string, number>()
        ;(likeRows || []).forEach((l) => counts.set(l.song_id, (counts.get(l.song_id) || 0) + 1))
        const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id)
        if (topIds.length > 0) {
          const { data: songs } = await supabase.from('songs').select('*').in('id', topIds)
          const byId = new Map((songs as Song[] || []).map((s) => [s.id, s]))
          const sorted = topIds.map((id) => ({ song: byId.get(id), count: counts.get(id)! }))
            .filter((x): x is { song: Song; count: number } => !!x.song)
          setWeekly(sorted.map((x) => x.song))
          setWeeklyCounts(new Map(sorted.map((x) => [x.song.id, x.count])))
        }
      } catch {}
      try {
        const { data: listenRows } = await supabase
          .from('listen_history')
          .select('user_id, listened_at')
          .gte('listened_at', weekAgo)
        const counts = new Map<string, number>()
        ;(listenRows || []).forEach((l) => counts.set(l.user_id, (counts.get(l.user_id) || 0) + 1))
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
        if (top.length > 0) {
          const { data: profiles } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .in('id', top.map(([id]) => id))
          const byId = new Map((profiles || []).map((p) => [p.id, p]))
          setLeaderboard(top.map(([id, count]) => ({
            user_id: id,
            username: byId.get(id)?.username || 'Wavey',
            avatar_url: byId.get(id)?.avatar_url || '',
            count,
          })))
        }
      } catch {}
      setLoading(false)
    })()
  }, [])

  const medals = [Crown, Medal, Medal]

  function playAll(songs: Song[], start?: Song) {
    if (songs.length === 0) return
    setQueue(songs)
    setCurrentSong(start || songs[0])
  }

  function playSong(song: Song) {
    if (currentSong?.id === song.id) {
      togglePlay()
      return
    }
    setCurrentSong(song)
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <Trophy size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">Haftalık Charts</h1>
          <p className="text-xs text-surface-400">Son 7 günün en çok beğenilen şarkıları ve en aktif dinleyicileri</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('songs')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'songs' ? 'bg-wave-500/15 text-wave-400 border border-wave-500/30' : 'text-surface-400 hover:text-white border border-transparent'}`}>
          <TrendingUp size={14} className="inline mr-1.5 -mt-0.5" />Şarkılar
        </button>
        <button onClick={() => setTab('listeners')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'listeners' ? 'bg-wave-500/15 text-wave-400 border border-wave-500/30' : 'text-surface-400 hover:text-white border border-transparent'}`}>
          <Trophy size={14} className="inline mr-1.5 -mt-0.5" />Dinleyiciler
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-3xl">
          {tab === 'songs' ? (
            weekly.length === 0 ? (
              <div className="text-center py-16 text-surface-500">
                <Music2 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Bu hafta henüz beğeni verisi yok</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => playAll(weekly)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-wave-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-wave-500/20">
                    <Play size={16} fill="currentColor" />Hepsini Çal
                  </button>
                  {user && <span className="text-xs text-surface-500">Top {weekly.length} şarkı</span>}
                </div>
                {weekly.map((song, i) => (
                  <div key={song.id} onClick={() => playSong(song)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
                    <div className="w-8 text-center flex-shrink-0">
                      {i < 3 ? (
                        <div className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center ${i === 0 ? 'bg-yellow-500/15 text-yellow-400' : i === 1 ? 'bg-slate-400/15 text-slate-300' : 'bg-orange-500/15 text-orange-400'}`}>
                          <Trophy size={13} />
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-surface-500">{i + 1}</span>
                      )}
                    </div>
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-11 h-11 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center"><Music2 size={16} className="text-surface-500" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-wave-400 transition-colors">{song.title}</p>
                      <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                    </div>
                    <span className="text-[11px] text-surface-500 flex items-center gap-1 flex-shrink-0">
                      <Heart size={11} className="text-pink-500" />{weeklyCounts.get(song.id) || 0}
                    </span>
                    <span className="text-[11px] text-surface-500 font-mono flex-shrink-0">{formatDuration(song.duration)}</span>
                    {currentSong?.id === song.id && isPlaying && (
                      <span className="flex gap-0.5 items-center flex-shrink-0">
                        {[0, 1, 2].map((b) => <span key={b} className="w-0.5 h-3 bg-wave-400 animate-wave rounded-full" style={{ animationDelay: `${b * 0.15}s` }} />)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            leaderboard.length === 0 ? (
              <div className="text-center py-16 text-surface-500">
                <Crown size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Müzik dinlemeye başla, liderlik tablosuna gir!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const Icon = medals[i] || Trophy
                  return (
                    <div key={entry.user_id} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${i === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' : 'bg-surface-800/30 border border-surface-800/40'}`}>
                      <div className={`w-8 text-center flex-shrink-0 ${i < 3 ? 'text-yellow-400' : 'text-surface-500'}`}>
                        <Icon size={16} className="inline" />
                      </div>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-surface-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-700 to-surface-800 border border-surface-600 flex items-center justify-center">
                          <Music2 size={15} className="text-surface-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{entry.username}</p>
                        <p className="text-[10px] text-surface-500">7 günde {entry.count} şarkı dinledi</p>
                      </div>
                      {i === 0 && <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 font-bold flex-shrink-0">1 NUMARA</span>}
                      {entry.user_id === user?.id && <span className="text-[10px] px-2 py-1 rounded-full bg-wave-500/15 text-wave-400 font-semibold flex-shrink-0">SEN</span>}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}