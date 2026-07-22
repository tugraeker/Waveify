import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Activity } from '@/types'
import { Music, Heart, PlusCircle, UserPlus, Globe, Play, Activity as ActivityIcon } from 'lucide-react'

export default function ActivityPage() {
  const { user, setCurrentSong, setQueue } = useStore()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchActivities()
  }, [user])

  async function fetchActivities() {
    setLoading(true)
    const { data: friendIds } = await supabase.from('friends').select('friend_id').eq('user_id', user!.id).eq('status', 'accepted')
    const ids = friendIds?.map((f: any) => f.friend_id) || []
    ids.push(user!.id)
    const { data } = await supabase
      .from('activities')
      .select('*, user:users(*), song:songs(*)')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setActivities(data as any)
    setLoading(false)
  }

  async function logActivity(type: Activity['type'], songId?: string) {
    if (!user) return
    await supabase.from('activities').insert({
      user_id: user.id,
      type,
      data: songId ? { song_id: songId } : {},
    })
  }

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

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aktivite</h1>
        <button onClick={fetchActivities} className="text-xs text-surface-500 hover:text-white transition-colors">Yenile</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-surface-500"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-surface-500">
          <ActivityIcon size={48} className="mb-4 opacity-30" />
          <p className="text-sm">Henüz aktivite yok</p>
          <p className="text-xs mt-1">Arkadaşların bir şey yapınca burada görünecek</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((a) => (
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
              <span className="text-[10px] text-surface-600 flex-shrink-0">{new Date(a.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
