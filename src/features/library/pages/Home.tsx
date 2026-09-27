import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { useShallow } from 'zustand/react/shallow'
import { supabase } from '../../../core/supabaseClient'
import { formatDuration } from '@/lib/utils'
import { SongSkeleton, CardSkeleton } from '@/components/Skeleton'
import ContextMenu from '@/components/ContextMenu'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { generateMoodPlaylist, MOODS } from '@/lib/moods'
import { getFollowedArtists } from '@/lib/artists'
import type { Song } from '@/types'
import { Flame, TrendingUp, Clock, Heart, Music, Play, Pause, AudioWaveform, Award, Sparkles, Users, Radio, HelpCircle, ArrowUpRight, ChevronRight, Disc3 } from 'lucide-react'
import { computeLevel } from '@/types'
import { getXpTotal } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'
import { dailyFact, dailyFortune, wheelRotation } from '@/lib/fun'
import { FlowToolsSection } from '@/components/FlowTools'

const autoPlaylistDefs = [
  { name: 'En Çok Dinlenenler', icon: Flame, auto_type: 'top50', gradient: 'from-rose-600 to-orange-600' },
  { name: 'Bu Hafta Popüler', icon: TrendingUp, auto_type: 'weekly', gradient: 'from-violet-600 to-pink-600' },
  { name: 'En Son Yüklenenler', icon: Clock, auto_type: 'latest', gradient: 'from-sky-600 to-cyan-600' },
  { name: 'Beğenilenler', icon: Heart, auto_type: 'liked', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Arkadaşlarının En Çok Dinledikleri', icon: Music, auto_type: 'friends_top', gradient: 'from-amber-600 to-yellow-600' },
]

export default function Home() {
  const { user, songs, setSongs, setActivePlaylist, setQueue, setCurrentSong, currentSong, isPlaying } = useStore(useShallow((state) => ({
    user: state.user, songs: state.songs, setSongs: state.setSongs, setActivePlaylist: state.setActivePlaylist,
    setQueue: state.setQueue, setCurrentSong: state.setCurrentSong, currentSong: state.currentSong, isPlaying: state.isPlaying,
  })))
  const navigate = useNavigate()
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [greeting, setGreeting] = useState('')
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ song: Song; x: number; y: number } | null>(null)
  const [addPlaylistSong, setAddPlaylistSong] = useState<Song | null>(null)
  const [followedSongs, setFollowedSongs] = useState<Song[]>([])
  const [friendActivity, setFriendActivity] = useState<{ user: any; song: Song; at: string }[]>([])
  const [wheelAngle, setWheelAngle] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)

  const wheelSegments = songs.length >= 8 ? songs.slice(0, 8) : songs

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
            .select('user_id, played_at, song_id')
            .in('user_id', ids)
            .order('played_at', { ascending: false })
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
            items.push({ user: userMap.get(p.user_id), song, at: p.played_at })
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
    setQueue(songs.length > 0 ? songs : [song]); setCurrentSong(song)
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
  const focusSong = currentSong || recentSongs[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in relative z-10">
      <section className="relative isolate mb-9 min-h-[330px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0e18]/80 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-24 -top-32 h-[430px] w-[430px] rounded-full bg-violet-500/20 blur-[105px]" />
        <div className="pointer-events-none absolute -bottom-44 left-[24%] h-[370px] w-[370px] rounded-full bg-cyan-400/10 blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.13)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(110deg,black,transparent_78%)]" />

        <div className="relative z-10 grid min-h-[270px] items-center gap-8 md:grid-cols-[1.15fr_.85fr] lg:gap-10">
          <div className="max-w-2xl py-2">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-wave-300/20 bg-wave-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-wave-200">
              <span className="h-1.5 w-1.5 rounded-full bg-wave-300 shadow-[0_0_12px_#C6FF3E]" /> KENDİ SES EVRENİN
            </div>
            <h1 className="font-display text-[clamp(2.35rem,5.8vw,4.7rem)] font-bold leading-[0.96] tracking-[-0.065em] text-white">
              {greeting},<br />
              <span className="bg-gradient-to-r from-wave-200 via-cyan-200 to-violet-300 bg-clip-text text-transparent">{user?.username || 'Dinleyici'}.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/55 sm:text-[15px]">
              Bugünün ritmini seç. Sevdiğin şarkılar, yeni keşifler ve arkadaşların tek bir akışta.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (!focusSong) navigate('/upload')
                  else if (isPlaying && currentSong?.id === focusSong.id) navigate('/now-playing')
                  else playSong(focusSong)
                }}
                className="group inline-flex items-center gap-2.5 rounded-full bg-wave-300 px-5 py-3 text-sm font-bold text-[#11150a] shadow-[0_8px_28px_rgba(198,255,62,.22)] transition-all hover:-translate-y-0.5 hover:bg-wave-200 hover:shadow-[0_12px_32px_rgba(198,255,62,.3)] active:translate-y-0"
              >
                {isPlaying && currentSong?.id === focusSong?.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {focusSong ? isPlaying && currentSong?.id === focusSong.id ? 'Oynatıcıya dön' : 'Hemen dinle' : 'İlk parçanı ekle'}
                <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => navigate('/search')} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-white/75 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.09] hover:text-white">
                Keşfet <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
              <span className="inline-flex items-center gap-2"><Award size={14} className="text-wave-300" /> Seviye <strong className="text-white/75">{lv.level}</strong><span className="text-white/20">·</span><span className="font-mono text-wave-200">{xp} XP</span></span>
              <span className="h-3 w-px bg-white/10" />
              <span className="inline-flex items-center gap-2"><Disc3 size={14} className="text-cyan-200" /> {songs.length} parça keşfetmeye hazır</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[350px] md:mr-0 md:max-w-none">
            <div className="absolute -inset-4 rounded-[30px] bg-gradient-to-br from-violet-400/20 via-cyan-300/10 to-wave-300/15 blur-2xl" />
            <div className="group relative overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.06] p-3 shadow-[0_26px_70px_rgba(0,0,0,.4)] backdrop-blur-2xl">
              <div className="relative aspect-[1.72/1] overflow-hidden rounded-[19px] bg-gradient-to-br from-[#35205b] via-[#112634] to-[#18220f]">
                {focusSong?.cover_url ? (
                  <img src={focusSong.cover_url} alt={`${focusSong.title} kapak görseli`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <div className="absolute h-48 w-48 rounded-full bg-violet-400/35 blur-3xl" />
                    <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border border-white/20" />
                    <div className="absolute -right-2 -top-6 h-32 w-32 rounded-full border border-white/15" />
                    <AudioWaveform size={64} strokeWidth={1.2} className="relative text-white/80 drop-shadow-[0_0_24px_rgba(125,249,255,.45)]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05070c]/95 via-[#05070c]/15 to-black/10" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-white/80 backdrop-blur-xl">
                  <span className={`h-1.5 w-1.5 rounded-full ${focusSong && isPlaying && currentSong?.id === focusSong.id ? 'animate-pulse bg-wave-300' : 'bg-white/50'}`} />
                  {focusSong ? currentSong?.id === focusSong.id ? 'Şimdi çalıyor' : 'Son eklenen' : 'WAVEIFY SEÇKİSİ'}
                </div>
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[.2em] text-white/55">{focusSong?.album || 'WAVEIFY SEÇKİSİ'}</p>
                    <p className="truncate font-display text-lg font-bold tracking-tight text-white sm:text-xl">{focusSong?.title || 'Sıradaki favorin burada'}</p>
                    <p className="mt-0.5 truncate text-xs text-white/60">{focusSong?.artist || 'Kitaplığından bir parça seç'}</p>
                  </div>
                  <button aria-label="Şarkıyı çal" onClick={() => {
                    if (!focusSong) navigate('/upload')
                    else if (isPlaying && currentSong?.id === focusSong.id) navigate('/now-playing')
                    else playSong(focusSong)
                  }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wave-300 text-[#11150a] shadow-[0_0_26px_rgba(198,255,62,.3)] transition-transform hover:scale-105 active:scale-95">
                    {isPlaying && currentSong?.id === focusSong?.id ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between px-2 pb-1 pt-3">
                <span className="text-[10px] font-medium tracking-wide text-white/45">{focusSong ? 'Kişisel akışından seçildi' : 'Müzik yolculuğun burada başlar'}</span>
                <div className="flex h-4 items-center gap-[3px]" aria-hidden="true">
                  {[7, 13, 9, 16, 6, 11, 15, 8, 12].map((height, index) => <span key={index} className={`w-[2px] rounded-full bg-gradient-to-t from-wave-400 to-cyan-200 ${focusSong && isPlaying && currentSong?.id === focusSong.id ? 'wave-bar' : ''}`} style={{ height, animationDelay: `${index * 90}ms` }} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-wave-200/65">AKIŞINI SEÇ</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Ruh haline göre</h2>
          </div>
          <span className="hidden text-xs text-white/35 sm:block">Bir dokunuşla sana özel liste</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => playMood(m.key)}
              disabled={songs.length === 0}
              className={`group relative min-h-[125px] overflow-hidden rounded-[22px] border border-white/10 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_38px_rgba(0,0,0,.28)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none bg-gradient-to-br ${m.gradient}`}
            >
              <span className="absolute -right-5 -top-7 h-24 w-24 rounded-full border border-white/15 bg-white/[0.07] transition-transform duration-500 group-hover:scale-125" />
              <span className="relative z-10 flex h-full min-h-[93px] flex-col items-start justify-between">
                <span className="text-[27px] drop-shadow-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">{m.emoji}</span>
                <span className="text-sm font-bold text-white drop-shadow-sm">{m.label}</span>
              </span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/[0.03]" />
              <span className="absolute right-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full border border-white/10 bg-white/15 opacity-0 backdrop-blur-sm transition-all group-hover:translate-y-0 group-hover:opacity-100">
                <Play size={13} fill="white" className="text-white ml-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-9">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200/60">KÜÇÜK BİR MOLA</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Müzik arası</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Günün Falı (129) */}
          <div className="glass interactive-glass rounded-[24px] p-5 border-fuchsia-400/15 relative min-h-[155px] overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-fuchsia-500/10 blur-3xl rounded-full pointer-events-none" />
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-fuchsia-200"><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-fuchsia-400/10"><Sparkles size={14} /></span> Günün Falı</p>
            <p className="relative text-sm leading-relaxed text-white/80">{dailyFortune()}</p>
            <p className="mt-3 text-[10px] text-white/35">Günün notu · sadece senin için</p>
          </div>

          {/* Günün Bilgisi (178) */}
          <div className="glass interactive-glass rounded-[24px] p-5 border-cyan-400/15 relative min-h-[155px] overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-cyan-200"><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-300/10"><HelpCircle size={14} /></span> Müzik Bilgisi</p>
            <p className="relative text-sm leading-relaxed text-white/80">{dailyFact()}</p>
            <p className="mt-3 text-[10px] text-white/35">Günlük bilgi dozu</p>
          </div>

          {/* Çarkıfelek (190) */}
          <div className="glass interactive-glass rounded-[24px] p-5 border-amber-400/15 relative min-h-[155px] overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-amber-200"><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-300/10"><AudioWaveform size={14} /></span> Rastgele bir parça</p>
            {wheelSegments.length === 0 ? (
              <p className="text-sm leading-relaxed text-white/55">Kütüphanenden rastgele bir şarkı seçelim. Önce birkaç parça ekle.</p>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: `rotate(${wheelAngle}deg)`, transition: wheelSpinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 1)' : 'none' }}>
                      {wheelSegments.map((s, i) => {
                        const angle = 360 / wheelSegments.length
                        const start = i * angle - 90
                        const colors = ['#f59e0b', '#22d3ee', '#a855f7', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#f97316']
                        return (
                          <g key={s.id}>
                            <path d={`M50 50 L50 4 A46 46 0 0 1 ${50 + 46 * Math.cos(((start + angle) * Math.PI) / 180)} ${50 + 46 * Math.sin(((start + angle) * Math.PI) / 180)} Z`} fill={colors[i % colors.length]} stroke="#0f1418" strokeWidth="0.5" />
                            <text x={50 + 30 * Math.cos(((start + angle / 2) * Math.PI) / 180)} y={50 + 30 * Math.sin(((start + angle / 2) * Math.PI) / 180)} fill="#fff" fontSize="6" textAnchor="middle" dominantBaseline="middle">🎵</text>
                          </g>
                        )
                      })}
                      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400"><span className="text-lg">▼</span></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (wheelSpinning) return
                        setWheelSpinning(true)
                        const target = wheelRotation(Date.now())
                        setWheelAngle(target)
                        setTimeout(() => {
                          setWheelSpinning(false)
                          const seg = Math.floor(((360 - (target % 360) - 270 + 360) % 360) / (360 / wheelSegments.length)) % wheelSegments.length
                          const song = wheelSegments[seg]
                          if (song) {
                            playSong(song)
                            emitToast(`🎡 Çark ${song.title} — ${song.artist} çıktı!`, 'success')
                          }
                        }, 3600)
                      }}
                      disabled={wheelSpinning}
                      className="w-full rounded-xl border border-amber-200/20 bg-amber-300/10 py-2.5 text-xs font-bold text-amber-100 transition-all hover:border-amber-200/35 hover:bg-amber-300/15 disabled:opacity-50"
                    >
                      {wheelSpinning ? 'Çark dönüyor…' : 'Çevir ve Dinle'}
                    </button>
                    <p className="mt-2 truncate text-[10px] text-white/35">Kütüphanenden rastgele 8 parça</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mb-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-violet-200/65">SANA ÖZEL SEÇKİLER</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-white">Bir sonraki favorin</h2>
          </div>
          <button onClick={() => navigate('/library')} className="hidden items-center gap-1 text-xs font-semibold text-white/45 transition hover:text-wave-200 sm:flex">Tüm listeler <ArrowUpRight size={14} /></button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {autoPlaylistDefs.map(({ name, icon: Icon, auto_type, gradient }) => (
              <button
                key={auto_type}
                onClick={() => {
                  setActivePlaylist({ id: auto_type, name, user_id: '', type: 'auto', auto_type: auto_type as any, created_at: '' })
                  navigate('/playlist')
                }}
                className="group interactive-glass relative aspect-[1.13/1] overflow-hidden rounded-[23px] border border-white/10 p-4 text-left sm:aspect-square sm:p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 transition-opacity duration-300 group-hover:opacity-95`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06080d]/95 via-[#06080d]/10 to-white/[0.08]" />
                <Icon size={76} strokeWidth={1} className="absolute -right-3 -top-3 rotate-[-13deg] text-white/[0.16] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110" />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/15 text-white/75 backdrop-blur-lg transition group-hover:bg-white/20 group-hover:text-white"><ArrowUpRight size={14} /></span>
                <div className="relative z-10 mt-auto">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-[.18em] text-white/60">WAVEIFY MİX</span>
                  <span className="block max-w-[14rem] text-sm font-bold leading-snug text-white sm:text-[15px]">{name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {friendActivity.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/65">AYNI DALGADA</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Arkadaşların ne dinliyor?</h2>
            </div>
            <Users size={18} className="text-emerald-200/70" />
          </div>
          <div className="glass rounded-[24px] p-2 sm:p-3">
            {friendActivity.map((item, i) => (
              <div key={i} onClick={() => playSong(item.song)} className="group flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition-all hover:bg-white/[0.055] sm:gap-4 sm:p-3">
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
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-pink-200/65">YENİDEN KEŞFET</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Takip ettiğin sanatçılar</h2>
            </div>
            <Radio size={18} className="text-pink-200/70" />
          </div>
          <div className="glass rounded-[24px] p-2 sm:p-3">
            {followedSongs.map((song) => (
              <div key={song.id} onClick={() => playSong(song)} className="song-row group flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5 transition-all duration-200 hover:bg-white/[0.055] sm:p-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="h-full w-full rounded-xl object-cover" />
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

      <section className="mb-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-wave-200/65">KİTAPLIĞINDAN</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-white">En son eklenenler</h2>
          </div>
          <button onClick={() => navigate('/library')} className="inline-flex items-center gap-1 text-xs font-semibold text-white/45 transition-colors hover:text-wave-200">Kitaplığa git <ChevronRight size={14} /></button>
        </div>
        {loading ? (
          <div className="glass rounded-[24px] p-2 sm:p-3">{Array.from({ length: 5 }).map((_, i) => <SongSkeleton key={i} />)}</div>
        ) : recentSongs.length === 0 ? (
          <div className="glass relative flex flex-col items-center justify-center overflow-hidden rounded-[28px] border-dashed py-14 text-center">
            <div className="pointer-events-none absolute h-40 w-40 rounded-full bg-wave-300/10 blur-3xl" />
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-wave-200"><AudioWaveform size={27} /></div>
            <p className="relative text-sm font-semibold text-white/80">Kitaplığın ilk ritmini bekliyor</p>
            <p className="relative mt-1 max-w-xs text-xs leading-5 text-white/40">Parçalarını ekle, ruh haline göre akışlar oluşturalım.</p>
            <button onClick={() => navigate('/upload')} className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-wave-200/20 bg-wave-200/10 px-4 py-2 text-xs font-bold text-wave-100 transition hover:bg-wave-200/15">İlk şarkını yükle <ArrowUpRight size={13} /></button>
          </div>
        ) : (
          <div className="glass rounded-[24px] p-2 sm:p-3">
            {recentSongs.map((song) => (
              <div
                key={song.id}
                className="song-row group flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5 transition-all duration-200 hover:bg-white/[0.055] sm:p-3"
                onClick={() => playSong(song)}
                onContextMenu={(e) => handleContextMenu(e, song)}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="h-full w-full rounded-xl object-cover" />
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

      <FlowToolsSection />

      {ctxMenu && <ContextMenu song={ctxMenu.song} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAddToPlaylist={() => setAddPlaylistSong(ctxMenu.song)} />}
      {addPlaylistSong && <AddToPlaylistModal song={addPlaylistSong} onClose={() => setAddPlaylistSong(null)} />}
    </div>
  )
}
