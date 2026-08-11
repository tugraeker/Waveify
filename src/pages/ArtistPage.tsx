import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui'
import { isFollowing, toggleFollow } from '@/lib/artists'
import type { Song } from '@/types'
import { ArrowLeft, Play, Pause, Music2, Plus, Check, Crown, History } from 'lucide-react'

export default function ArtistPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { setCurrentSong, setQueue, currentSong, isPlaying } = useStore()
  const [songs, setSongs] = useState<Song[]>([])
  const [following, setFollowing] = useState(false)
  const [topListeners, setTopListeners] = useState<{ username: string; count: number }[]>([])
  const [timeMachineLoading, setTimeMachineLoading] = useState(false)

  const artistName = name ? decodeURIComponent(name) : ''

  useEffect(() => {
    setFollowing(isFollowing(artistName))
  }, [artistName])

  function handleFollow() {
    const now = toggleFollow(artistName)
    setFollowing(now)
  }

  useEffect(() => {
    if (!name) return
    supabase.from('songs').select('*').eq('artist', decodeURIComponent(name)).order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setSongs(data)
    })
  }, [name])

  /* 181 — Kral Dinleyici: bu sanatçının en sadık dinleyicileri */
  useEffect(() => {
    if (!name || !songs.length) return
    const songIds = songs.map((s) => s.id)
    supabase
      .from('listen_history')
      .select('user:users(username), song_id')
      .in('song_id', songIds.slice(0, 30))
      .limit(400)
      .then(({ data }) => {
        const map = new Map<string, number>()
        for (const h of (data || []) as any[]) {
          const uname = h.user?.username
          if (uname) map.set(uname, (map.get(uname) || 0) + 1)
        }
        setTopListeners([...map.entries()].map(([username, count]) => ({ username, count })).sort((a, b) => b.count - a.count).slice(0, 3))
      })
  }, [name, songs.length])

  /* 182 — Zaman Makinesi: kronolojik discography akışı */
  async function timeMachine() {
    if (!songs.length || timeMachineLoading) return
    setTimeMachineLoading(true)
    const { data } = await supabase.from('songs').select('*').eq('artist', artistName).order('created_at', { ascending: true }).limit(100)
    const list = data || songs
    if (!list.length) { setTimeMachineLoading(false); return }
    setQueue(list)
    setCurrentSong(list[0])
    setTimeMachineLoading(false)
  }

  const playAll = () => {
    if (songs.length === 0) return
    setQueue(songs)
    setCurrentSong(songs[0])
  }

  const playSong = (song: Song) => {
    setQueue(songs)
    setCurrentSong(song)
  }

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
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" size="lg" onClick={playAll} disabled={songs.length === 0}>
                <Play size={18} fill="white" /> Tümünü Oynat
              </Button>
              <button
                onClick={timeMachine}
                disabled={songs.length === 0 || timeMachineLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border bg-surface-800 text-surface-300 border-surface-700 hover:text-white disabled:opacity-50"
              >
                <History size={15} />
                {timeMachineLoading ? 'Hazırlanıyor...' : 'Zaman Makinesi'}
              </button>
              <button
                onClick={handleFollow}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  following
                    ? 'bg-wave-500/10 text-wave-400 border-wave-500/30'
                    : 'bg-surface-800 text-surface-300 border-surface-700 hover:text-white'
                }`}
              >
                {following ? <Check size={15} /> : <Plus size={15} />}
                {following ? 'Takip Ediliyor' : 'Takip Et'}
              </button>
            </div>
            {topListeners.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1"><Crown size={12} /> Kral Dinleyiciler</span>
                {topListeners.map((l, i) => (
                  <span key={l.username} className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${i === 0 ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-surface-800/70 border-surface-700 text-surface-300'}`}>
                    {i === 0 ? '👑 ' : ''}{l.username} · {l.count}×
                  </span>
                ))}
              </div>
            )}
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