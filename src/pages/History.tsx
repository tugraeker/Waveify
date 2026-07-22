import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { SongSkeleton } from '@/components/Skeleton'
import type { Song } from '@/types'
import { Play, Clock, Music, Trash2, AudioWaveform } from 'lucide-react'

export default function History() {
  const { user, setQueue, setCurrentSong } = useStore()
  const navigate = useNavigate()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchHistory()
  }, [user?.id])

  async function fetchHistory() {
    setLoading(true)
    const { data } = await supabase
      .from('listen_history')
      .select('*, song:songs(*)')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: false })
      .limit(100)
    if (data) setHistory(data.filter((h: any) => h.song))
    setLoading(false)
  }

  function playSong(song: Song) {
    const songs = history.map((h: any) => h.song).filter(Boolean)
    setQueue(songs)
    setCurrentSong(song)
  }

  async function clearHistory() {
    await supabase.from('listen_history').delete().eq('user_id', user!.id)
    setHistory([])
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dinleme Geçmişi</h1>
        {history.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
            <Trash2 size={12} /> Temizle
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-1"><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-surface-500">
          <AudioWaveform size={56} className="mb-5 opacity-30" />
          <p className="text-base font-medium text-surface-400">Henüz dinleme geçmişin yok</p>
          <p className="text-sm mt-1 text-surface-500">Şarkı dinledikçe burada görünecek</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {history.map((h: any) => (
            <div
              key={h.id}
              onClick={() => playSong(h.song)}
              className="group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 card-hover"
            >
              {h.song.cover_url ? (
                <img src={h.song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-surface-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{h.song.title}</p>
                <p className="text-xs text-surface-400 truncate">{h.song.artist}</p>
              </div>
              <span className="text-xs text-surface-500 tabular-nums">{formatDuration(h.song.duration)}</span>
              <span className="text-[10px] text-surface-600 flex-shrink-0 w-16 text-right">{new Date(h.played_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
