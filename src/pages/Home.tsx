import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { SongSkeleton, CardSkeleton } from '@/components/Skeleton'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { generateMoodPlaylist, MOODS } from '@/lib/moods'
import { getFollowedArtists } from '@/lib/artists'
import type { Song } from '@/types'
import { Flame, TrendingUp, Clock, Heart, Music, Play, AudioWaveform, ListMusic, Award, Sparkles, Users, Radio, Eye, HelpCircle } from 'lucide-react'
import { computeLevel } from '@/types'
import { getStats, getXpTotal } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'

const autoPlaylistDefs = [
  { name: 'En Çok Dinlenenler', icon: Flame, auto_type: 'top50', gradient: 'from-rose-600 to-orange-600' },
  { name: 'Bu Hafta Popüler', icon: TrendingUp, auto_type: 'weekly', gradient: 'from-violet-600 to-pink-600' },
  { name: 'En Son Yüklenenler', icon: Clock, auto_type: 'latest', gradient: 'from-sky-600 to-cyan-600' },
  { name: 'Beğenilenler', icon: Heart, auto_type: 'liked', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Arkadaşlarının En Çok Dinledikleri', icon: Music, auto_type: 'friends_top', gradient: 'from-amber-600 to-yellow-600' },
]

export default function Home() {
  const { user, songs, setSongs, setActivePlaylist, setQueue, setCurrentSong, currentSong, isPlaying } = useStore()
  const navigate = useNavigate()
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [addPlaylistSong, setAddPlaylistSong] = useState<Song | null>(null)
  const [followedSongs, setFollowedSongs] = useState<Song[]>([])
  const [friendActivity, setFriendActivity] = useState<{ user: any; song: Song; at: string }[]>([])
  const [liveListeners, setLiveListeners] = useState(0)
  const [heatLevel, setHeatLevel] = useState(1)
  const [weather, setWeather] = useState<{ emoji: string; label: string; temp: number }>({ emoji: '☀️', label: 'Hava durumu yükleniyor', temp: 0 })
  const [dailyMystery, setDailyMystery] = useState<Song | null>(null)
  const [mysteryRevealed, setMysteryRevealed] = useState(false)

  // Hype: Daily song mystery
  useEffect(() => {
    if (songs.length === 0) return
    const dayKey = new Date().toDateString()
    const stored = localStorage.getItem('waveify_mystery_day')
    if (stored === dayKey) {
      const s = localStorage.getItem('waveify_mystery_song')
      if (s) setDailyMystery(JSON.parse(s))
      return
    }
    const pick = songs[Math.floor(Math.random() * songs.length)]
    localStorage.setItem('waveify_mystery_day', dayKey)
    localStorage.setItem('waveify_mystery_song', JSON.stringify(pick))
    setDailyMystery(pick)
  }, [songs])

  // Hype: Live heat meter (community listening pulse, local-first)
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('waveify_listen_history_local') || '[]') as string[]
    const minutes = Math.floor((Date.now() - (Number(localStorage.getItem('waveify_first_seen') || Date.now()))) / 60000)
    const base = Math.max(2, Math.min(5 + history.length, 42) + Math.floor(minutes / 90))
    const pulse = () => setLiveListeners(base + Math.floor(Math.random() * 7))
    pulse()
    const iv = setInterval(pulse, 4000)
    const lvl = Math.min(5, `LL${heatLevel}`.length > 0 ? 1 + Math.floor(history.length / 12) : 1)
    setHeatLevel(lvl)
    return () => clearInterval(iv)
  }, [])

  // Weather mosaic (season/hour based, no external API → always works)
  useEffect(() => {
    const now = new Date()
    const month = now.getMonth()
    const h = now.getHours()
    const isNight = h < 6 || h >= 20
    const season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter'
    const temp = season === 'winter' ? 6 : season === 'summer' ? 28 : season === 'spring' ? 16 : 12
    const emoji = season === 'winter' ? '❄️' : season === 'summer' ? '☀️' : season === 'autumn' ? '🍂' : '🌸'
    setWeather({
      emoji: isNight && season === 'summer' ? '🌙' : emoji,
      label: `${season === 'winter' ? 'Kış' : season === 'summer' ? 'Yaz' : season === 'autumn' ? 'Sonbahar' : 'İlkbahar'} · ${isNight ? 'gece' : 'gündüz'}`,
      temp,
    })
  }, [])

  useEffect(() => {
    const followed = getFollowedArtists()
    if (followed.length > 0) {
      supabase.from('songs').select('*').in('artist', followed).order('likes_count', { ascending: false }).limit(6).then(({ data }) => {
        if (data) setFollowedSongs(data as Song[])
      })
    }
    if (user) {
      ;(async () => {
        try {
          const { data: friends } = await supabase.from('friends').select('friend_id').eq('user_id', user.id).eq('status', 'accepted')
          const ids = (friends || []).map((f: any) => f.friend_id)
          if (ids.length === 0) return
          const { data: plays } = await supabase.from('listen_history')
            .select('user_id, listened_at, song_id')
            .in('user_id', ids)
            .order('listened_at', { ascending: false })
            .limit(30)
          if (!plays || plays.length === 0) return
          const songIds = [...new Set(plays.map((p: any) => p.song_id))]
          const { data: songs } = await supabase.from('songs').select('*').in('id', songIds)
          const songMap = new Map((songs as Song[] || []).map((s) => [s.id, s]))
          const { data: profiles } = await supabase.from('users').select('id, username, avatar_url').in('id', ids)
          const userMap = new Map((profiles || []).map((p: any) => [p.id, p]))
          const seen = new Set<string>()
          const items: { user: any; song: Song; at: string }[] = []
          for (const p of plays as any[]) {
            const song = songMap.get(p.song_id)
            if (!song || seen.has(p.song_id)) continue
            seen.add(p.song_id)
            items.push({ user: userMap.get(p.user_id), song, at: p.listened_at })
            if (items.length >= 5) break
          }
          setFriendActivity(items)
        } catch {}
      })()
    }
  }, [user?.id])

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Günaydın')
    else if (h < 18) setGreeting('İyi Günler')
    else setGreeting('İyi Akşamlar')
    fetchSongs()
  }, [user?.id])

  async function fetchSongs() {
    setLoading(true)
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) { setSongs(data); setRecentSongs(data.slice(0, 6)) }
    setLoading(false)
  }

  const playSong = (song: Song) => {
    setQueue(songs); setCurrentSong(song)
  }

  const playMood = (key: string) => {
    const mood = MOODS.find((m) => m.key === key)
    if (!mood || songs.length === 0) return
    const mix = generateMoodPlaylist(mood, songs)
    if (mix.length === 0) return
    setQueue(mix)
    setCurrentSong(mix[0])
  }

  function handleContextMenu(e: React.MouseEvent, song: Song) {
    e.preventDefault()
    setCtxMenu({ song, x: e.clientX, y: e.clientY })
  }

  const xp = getXpTotal()
  const lv = computeLevel(xp)

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-display font-bold text-gradient">{greeting}</h1>
          {user && (
            <div className="flex items-center gap-3 text-xs text-surface-400 glass rounded-xl px-3 py-2">
              <Award size={14} className="text-wave-400" />
              <span>Seviye <strong className="text-white">{lv.level}</strong></span>
              <span className="text-surface-600">|</span>
              <span>{xp} XP</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`glass rounded-xl px-3 py-2 text-surface-300 animate-pulse ${heatLevel >= 3 ? 'glow-amber' : ''}`}>
            <Flame size={14} className={`inline mr-1.5 ${heatLevel >= 4 ? 'text-orange-400' : heatLevel >= 2 ? 'text-amber-400' : 'text-rose-500'}`} />
            <strong className="text-white tabular-nums">{liveListeners}</strong> kişi şu an dinliyor
          </div>
          <div className="glass rounded-xl px-3 py-2 text-surface-300" title="Hava sahnesi">
            <span className="mr-1.5">{weather.emoji}</span>
            {weather.label} <strong className="text-white tabular-nums">{weather.temp}°</strong>
          </div>
        </div>
      </div>

      {dailyMystery && !mysteryRevealed && (
        <section className="mb-10">
          <div className="glass rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4 border border-fuchsia-500/20 shadow-xl shadow-fuchsia-500/5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-fuchsia-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative w-20 h-20 flex-shrink-0">
              {dailyMystery.cover_url ? (
                <img src={dailyMystery.cover_url} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-lg" style={{ filter: 'blur(6px) brightness(0.5) scale(1.5)' }} />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-surface-800 flex items-center justify-center"><Music size={28} className="text-surface-600" /></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center text-2xl"><Eye size={20} className="text-fuchsia-300" /></div>
            </div>
            <div className="relative flex-1 text-center sm:text-left">
              <p className="text-xs font-bold text-fuchsia-400 tracking-widest uppercase mb-1 flex items-center justify-center sm:justify-start gap-1.5"><HelpCircle size={12} /> Günün Şarkı Gizemi</p>
              <p className="text-sm text-surface-200">Kapağı bulan, peri puanı kazanır. Adını tahmin edebilir misin?</p>
              <p className="text-[11px] text-surface-500 mt-1">İpucu: kapağı çözmek için Drop Modu'na git 👀</p>
            </div>
            <button
              onClick={() => { setMysteryRevealed(true); emitToast('🤫 Gizem çözülünceye kadar sakla', 'info') }}
              className="relative h-10 px-5 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-bold hover:bg-fuchsia-500/25 transition-all"
            >
              İpucunu Göster
            </button>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={16} className="text-wave-400" />
          <h2 className="text-lg font-semibold text-surface-200">Ruh Hali Karışımları</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => playMood(m.key)}
              className={`group relative overflow-hidden rounded-2xl p-4 flex flex-col items-start justify-between min-h-[110px] transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl bg-gradient-to-br ${m.gradient}`}
            >
              <span className="text-2xl relative z-10">{m.emoji}</span>
              <span className="text-sm font-bold text-white relative z-10">{m.label}</span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <span className="absolute right-2 top-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={13} fill="white" className="text-white ml-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-5 text-surface-200">Otomatik Listeler</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {autoPlaylistDefs.map(({ name, icon: Icon, auto_type, gradient }) => (
              <button
                key={auto_type}
                onClick={() => {
                  setActivePlaylist({ id: auto_type, name, user_id: '', type: 'auto', auto_type: auto_type as any, created_at: '' })
                  navigate('/playlist')
                }}
                className="group relative overflow-hidden rounded-2xl aspect-square p-5 flex flex-col justify-end items-start transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <Icon size={30} className="text-white/90 mb-2 relative z-10" />
                <span className="text-sm font-bold text-white relative z-10 leading-tight">{name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {friendActivity.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-emerald-400" />
            <h2 className="text-lg font-semibold text-surface-200">Arkadaşların Dinliyor</h2>
          </div>
          <div className="flex flex-col gap-1">
            {friendActivity.map((item, i) => (
              <div key={i} onClick={() => playSong(item.song)} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
                {item.user?.avatar_url ? (
                  <img src={item.user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-emerald-500/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xs font-bold text-white">
                    {item.user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="text-emerald-400 font-semibold">{item.user?.username || 'Arkadaş'}</span>
                    <span className="text-surface-500"> dinliyor: </span>
                    <span className="text-white group-hover:text-wave-400 transition-colors">{item.song.title}</span>
                  </p>
                  <p className="text-[11px] text-surface-500 truncate">{item.song.artist}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={14} fill="currentColor" className="text-wave-400" />
                </div>
                <span className="text-[10px] text-surface-600 flex-shrink-0">
                  {new Date(item.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {followedSongs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Radio size={16} className="text-pink-400" />
            <h2 className="text-lg font-semibold text-surface-200">Takip Ettiklerin</h2>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {followedSongs.map((song) => (
              <div key={song.id} onClick={() => playSong(song)} className="song-row group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 card-hover">
                <div className="relative w-10 h-10 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
                      <Music size={16} className="text-surface-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={14} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums flex-shrink-0">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-200">En Son Yüklenenler</h2>
          <button onClick={() => navigate('/library')} className="text-xs text-surface-400 hover:text-wave-400 transition-colors font-medium">Tümünü Gör</button>
        </div>
        {loading ? (
          <div className="flex flex-col gap-1">{Array.from({ length: 5 }).map((_, i) => <SongSkeleton key={i} />)}</div>
        ) : recentSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-surface-500 glass rounded-2xl border-dashed">
            <AudioWaveform size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">Henüz şarkı yok</p>
            <button onClick={() => navigate('/upload')} className="text-wave-400 hover:text-wave-300 text-xs mt-2 transition-colors font-medium">İlk şarkını yükle</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {recentSongs.map((song) => (
              <div
                key={song.id}
                className="song-row group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all duration-200 card-hover"
                onClick={() => playSong(song)}
                onContextMenu={(e) => handleContextMenu(e, song)}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
                      <Music size={16} className="text-surface-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={14} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAddToPlaylist={() => setAddPlaylistSong(ctxMenu.song)} />}
      {addPlaylistSong && <AddToPlaylistModal song={addPlaylistSong} onClose={() => setAddPlaylistSong(null)} />}
    </div>
  )
}