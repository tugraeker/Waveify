/**
 * Artist AI Page — Sanatçı Profil Sayfası (AI Destekli)
 * ────────────────────────────────────────────────────────
 * Yerel AI: sanatçı biyografisi, stil analizi, aura rengi,
 * mood haritası, benzer şarkı motorı, kral dinleyiciler,
 * zaman makinesi, frekans ısı haritası.
 */
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '../../../core/supabaseClient'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui'
import { isFollowing, toggleFollow } from '@/lib/artists'
import {
  buildArtistProfile, analyzeSong, findSimilarSongs,
  getMoodEmoji, getMoodLabel, getSongAuraColor,
  type ArtistProfile, type SongMood,
} from '@/lib/localAI'
import type { Song } from '@/types'
import {
  ArrowLeft, Play, Pause, Music2, Plus, Check, Crown, History,
  Brain, BarChart3, Zap, Flame, Wind, Sparkles, Radio,
  ChevronRight, Star, Clock, TrendingUp,
} from 'lucide-react'

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

function AuraBadge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-semibold border"
      style={{ borderColor: color + '60', color, backgroundColor: color + '18' }}
    >
      {label}
    </span>
  )
}

// Frekans ısı haritası: şarkıların energy değerini 7×n grid olarak gösterir
function EnergyHeatmap({ songs }: { songs: Song[] }) {
  const cells = songs.slice(0, 28)
  return (
    <div>
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Enerji Isı Haritası</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
        {cells.map((song, i) => {
          const fp = analyzeSong(song)
          const aura = getSongAuraColor(song)
          const opacity = 0.25 + fp.energy * 0.75
          return (
            <div
              key={song.id}
              title={`${song.title} — ${getMoodLabel(fp.mood)} (Enerji: ${Math.round(fp.energy * 100)}%)`}
              className="h-6 rounded cursor-pointer transition-all hover:scale-110"
              style={{ backgroundColor: aura, opacity }}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-sm bg-surface-700 opacity-30" />
        <span className="text-[10px] text-surface-500">Düşük enerji</span>
        <div className="w-3 h-3 rounded-sm bg-wave-400 opacity-90 ml-2" />
        <span className="text-[10px] text-surface-500">Yüksek enerji</span>
      </div>
    </div>
  )
}

// Mood dağılım pasta grafiği (CSS ile)
function MoodDistribution({ songs }: { songs: Song[] }) {
  const moodCount: Record<string, number> = {}
  songs.forEach(s => {
    const m = analyzeSong(s).mood
    moodCount[m] = (moodCount[m] || 0) + 1
  })
  const total = songs.length || 1
  const sorted = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Mood Dağılımı</p>
      {sorted.map(([mood, count]) => {
        const pct = Math.round((count / total) * 100)
        const aura = getSongAuraColor({ genre: mood } as any)
        return (
          <div key={mood} className="flex items-center gap-3">
            <span className="text-base w-6 text-center">{getMoodEmoji(mood as SongMood)}</span>
            <div className="flex-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-surface-300">{getMoodLabel(mood as SongMood)}</span>
                <span className="text-xs text-surface-500">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: aura }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function ArtistPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { setCurrentSong, setQueue, currentSong, isPlaying } = useStore()

  const [songs, setSongs]               = useState<Song[]>([])
  const [following, setFollowing]       = useState(false)
  const [topListeners, setTopListeners] = useState<{ username: string; count: number }[]>([])
  const [profile, setProfile]           = useState<ArtistProfile | null>(null)
  const [tab, setTab]                   = useState<'songs' | 'ai' | 'stats'>('songs')
  const [timeMachineLoading, setTmLoad] = useState(false)
  const [listenCounts, setListenCounts] = useState<Record<string, number>>({})

  const artistName = name ? decodeURIComponent(name) : ''

  // Takip durumu
  useEffect(() => { setFollowing(isFollowing(artistName)) }, [artistName])
  const handleFollow = () => setFollowing(toggleFollow(artistName))

  // Şarkıları yükle
  useEffect(() => {
    if (!name) return
    supabase
      .from('songs')
      .select('*')
      .eq('artist', decodeURIComponent(name))
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setSongs(data)
          const profile = buildArtistProfile(decodeURIComponent(name), data, {})
          setProfile(profile)
        }
      })
  }, [name])

  // Kral Dinleyiciler + dinleme sayıları
  useEffect(() => {
    if (!name || !songs.length) return
    const songIds = songs.map(s => s.id)
    supabase
      .from('listen_history')
      .select('user:users(username), song_id')
      .in('song_id', songIds.slice(0, 30))
      .limit(400)
      .then(({ data }) => {
        const userMap = new Map<string, number>()
        const songMap: Record<string, number> = {}
        for (const h of (data || []) as any[]) {
          const uname = h.user?.username
          if (uname) userMap.set(uname, (userMap.get(uname) || 0) + 1)
          if (h.song_id) songMap[h.song_id] = (songMap[h.song_id] || 0) + 1
        }
        setTopListeners(
          [...userMap.entries()]
            .map(([username, count]) => ({ username, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
        )
        setListenCounts(songMap)
        // Profili güncelle
        const p = buildArtistProfile(decodeURIComponent(name!), songs, songMap)
        setProfile(p)
      })
  }, [name, songs.length])

  // Zaman Makinesi
  async function timeMachine() {
    if (!songs.length || timeMachineLoading) return
    setTmLoad(true)
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('artist', artistName)
      .order('created_at', { ascending: true })
      .limit(100)
    const list = data || songs
    if (list.length) { setQueue(list); setCurrentSong(list[0]) }
    setTmLoad(false)
  }

  const playAll  = () => { if (songs.length) { setQueue(songs); setCurrentSong(songs[0]) } }
  const playSong = (song: Song) => { setQueue(songs); setCurrentSong(song) }

  const auraColor = profile?.auraColor || '#8b5cf6'

  // ─── AI Tab ─────────────────────────────────────────────────────────────────

  const renderAITab = () => {
    if (!profile) return <div className="text-center py-12 text-surface-500 text-sm">AI analizi hazırlanıyor...</div>
    const similarSongs = songs.length > 1 ? findSimilarSongs(songs[0], songs, 5) : []
    const energyProfile = profile.energyProfile
    const energyIcon = energyProfile === 'explosive' ? Flame : energyProfile === 'balanced' ? Zap : Wind
    const EIcon = energyIcon

    return (
      <div className="space-y-5 p-6">
        {/* AI Biyografi */}
        <div
          className="p-5 rounded-2xl border"
          style={{ borderColor: auraColor + '40', background: auraColor + '0a' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} style={{ color: auraColor }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: auraColor }}>
              AI Sanatçı Profili
            </span>
          </div>
          <p className="text-sm text-surface-200 leading-relaxed">{profile.bio}</p>
        </div>

        {/* Metrikler grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/40">
            <EIcon size={16} className="mb-2" style={{ color: auraColor }} />
            <p className="text-lg font-bold text-white capitalize">
              {energyProfile === 'explosive' ? 'Patlayıcı' : energyProfile === 'balanced' ? 'Dengeli' : 'Sakin'}
            </p>
            <p className="text-xs text-surface-400">Enerji Profili</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/40">
            <BarChart3 size={16} className="mb-2 text-cyan-400" />
            <p className="text-lg font-bold text-white">{profile.avgBpm} BPM</p>
            <p className="text-xs text-surface-400">Ortalama Tempo</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/40">
            <Star size={16} className="mb-2 text-amber-400" />
            <p className="text-lg font-bold text-white">{profile.uniquenessScore}</p>
            <p className="text-xs text-surface-400">Özgünlük Skoru / 100</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/40">
            <Clock size={16} className="mb-2 text-green-400" />
            <p className="text-lg font-bold text-white">
              {Math.round(profile.totalDuration / 60)}dk
            </p>
            <p className="text-xs text-surface-400">Toplam Müzik</p>
          </div>
        </div>

        {/* Dominant moods */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Baskın Ruh Hali</p>
          <div className="flex flex-wrap gap-2">
            {profile.dominantMoods.map(mood => (
              <div
                key={mood}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ borderColor: getSongAuraColor({ genre: mood } as any) + '50', background: getSongAuraColor({ genre: mood } as any) + '15' }}
              >
                <span className="text-xl">{getMoodEmoji(mood)}</span>
                <span className="text-sm font-medium text-white">{getMoodLabel(mood)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Style keywords */}
        {profile.styleKeywords.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Stil Etiketleri</p>
            <div className="flex flex-wrap gap-2">
              {profile.styleKeywords.map(kw => (
                <AuraBadge key={kw} color={auraColor} label={kw} />
              ))}
            </div>
          </div>
        )}

        {/* Mood dağılımı */}
        {songs.length > 0 && <MoodDistribution songs={songs} />}

        {/* Enerji ısı haritası */}
        {songs.length >= 4 && <EnergyHeatmap songs={songs} />}

        {/* Benzer şarkılar (same artist mood match) */}
        {similarSongs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Birbirine En Benzer Şarkılar
            </p>
            <div className="space-y-1.5">
              {similarSongs.map(song => {
                const fp = analyzeSong(song)
                const songAura = getSongAuraColor(song)
                return (
                  <button
                    key={song.id}
                    onClick={() => playSong(song)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:border-wave-500/30 transition-all text-left"
                  >
                    {song.cover_url
                      ? <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      : <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: songAura + '22' }}>
                          <Music2 size={14} style={{ color: songAura }} />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{song.title}</p>
                      <p className="text-xs text-surface-400">
                        {getMoodEmoji(fp.mood)} {getMoodLabel(fp.mood)} · ~{Math.round(fp.tempo)} BPM
                      </p>
                    </div>
                    <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Dinleme zirvesi */}
        <div
          className="p-4 rounded-xl border"
          style={{ borderColor: auraColor + '30', background: auraColor + '08' }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: auraColor }} />
            <span className="text-sm text-surface-300">
              Bu sanatçıyı en çok <strong className="text-white">{profile.listeningPeak}</strong> dinleyeceksin
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Stats Tab ───────────────────────────────────────────────────────────────

  const renderStatsTab = () => (
    <div className="space-y-4 p-6">
      {/* Top şarkılar (dinleme sayısına göre) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          En Çok Dinlenenler
        </p>
        {songs
          .slice()
          .sort((a, b) => (listenCounts[b.id] || 0) - (listenCounts[a.id] || 0))
          .slice(0, 10)
          .map((song, idx) => {
            const count = listenCounts[song.id] || 0
            const fp = analyzeSong(song)
            const songAura = getSongAuraColor(song)
            return (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:border-wave-500/30 cursor-pointer transition-all"
              >
                <span className={`text-sm font-bold w-5 text-center ${idx === 0 ? 'text-amber-400' : 'text-surface-500'}`}>
                  {idx + 1}
                </span>
                {song.cover_url
                  ? <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: songAura + '22' }}>
                      <Music2 size={14} style={{ color: songAura }} />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-surface-400">
                    {getMoodEmoji(fp.mood)} {count > 0 ? `${count}× dinlendi` : 'Henüz dinlenmedi'}
                  </p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            )
          })}
      </div>

      {/* Tür dağılımı */}
      {profile && profile.dominantGenres.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Türler</p>
          <div className="flex flex-wrap gap-2">
            {profile.dominantGenres.map(g => (
              <AuraBadge key={g} color={auraColor} label={g} />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ─── Songs Tab ────────────────────────────────────────────────────────────────

  const renderSongsTab = () => (
    <div className="p-6">
      {songs.length === 0 ? (
        <p className="text-surface-500 text-sm">Bu sanatçıya ait şarkı bulunamadı</p>
      ) : (
        <div className="flex flex-col gap-1">
          {songs.map((song, idx) => {
            const fp = analyzeSong(song)
            const songAura = getSongAuraColor(song)
            return (
              <div
                key={song.id}
                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                onClick={() => playSong(song)}
              >
                <span className="w-6 text-xs text-surface-500 text-right tabular-nums group-hover:hidden">{idx + 1}</span>
                <button className="hidden group-hover:flex w-6 text-wave-400 items-center justify-center">
                  {currentSong?.id === song.id && isPlaying
                    ? <Pause size={13} fill="currentColor" />
                    : <Play size={13} fill="currentColor" />
                  }
                </button>
                {song.cover_url
                  ? <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  : <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: songAura + '20' }}>
                      <Music2 size={16} style={{ color: songAura }} />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-xs text-surface-400 flex items-center gap-1">
                    <span>{getMoodEmoji(fp.mood)}</span>
                    <span>{getMoodLabel(fp.mood)}</span>
                    {fp.tempo > 0 && <span className="text-surface-600">· ~{Math.round(fp.tempo)} BPM</span>}
                  </p>
                </div>
                <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in">
      {/* Hero Header */}
      <div
        className="relative p-8 pb-6"
        style={{
          background: `linear-gradient(160deg, ${auraColor}22 0%, ${auraColor}08 40%, transparent 70%)`,
          borderBottom: `1px solid ${auraColor}20`,
        }}
      >
        {/* Aura glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: auraColor + '15' }}
        />

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-surface-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> Geri
        </button>

        <div className="flex items-end gap-6 relative">
          {/* Avatar */}
          <div
            className="w-40 h-40 rounded-2xl flex items-center justify-center shadow-2xl shrink-0 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${auraColor}33, ${auraColor}11)`, border: `1px solid ${auraColor}40` }}
          >
            <Music2 size={52} style={{ color: auraColor }} />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-2xl animate-pulse opacity-20"
              style={{ border: `2px solid ${auraColor}` }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase font-semibold tracking-widest text-surface-500">Sanatçı</p>
            <h1 className="text-4xl font-extrabold mt-1 text-white break-words">{artistName}</h1>
            <p className="text-sm text-surface-400 mt-1">{songs.length} şarkı</p>

            {/* Aura rengi + dominant mood */}
            {profile && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white/20"
                  style={{ background: auraColor }}
                  title="AI aura rengi"
                />
                {profile.dominantMoods.slice(0, 2).map(m => (
                  <AuraBadge key={m} color={auraColor} label={`${getMoodEmoji(m)} ${getMoodLabel(m)}`} />
                ))}
              </div>
            )}

            {/* Kontrol butonları */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
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
                    ? 'text-white border-transparent text-sm'
                    : 'bg-surface-800 text-surface-300 border-surface-700 hover:text-white'
                }`}
                style={following ? { background: auraColor + '22', borderColor: auraColor + '50', color: auraColor } : {}}
              >
                {following ? <Check size={15} /> : <Plus size={15} />}
                {following ? 'Takip Ediliyor' : 'Takip Et'}
              </button>
            </div>

            {/* Kral Dinleyiciler */}
            {topListeners.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1">
                  <Crown size={12} /> Kral Dinleyiciler
                </span>
                {topListeners.map((l, i) => (
                  <span
                    key={l.username}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                      i === 0
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-surface-800/70 border-surface-700 text-surface-300'
                    }`}
                  >
                    {i === 0 ? '👑 ' : ''}{l.username} · {l.count}×
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sekme bar */}
      <div className="flex border-b border-surface-800/60 px-6 gap-0">
        {([
          { id: 'songs', label: 'Şarkılar', icon: Music2 },
          { id: 'ai',    label: 'AI Profil', icon: Brain },
          { id: 'stats', label: 'İstatistik', icon: BarChart3 },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
              tab === t.id
                ? 'border-wave-400 text-white'
                : 'border-transparent text-surface-400 hover:text-white'
            }`}
            style={tab === t.id ? { borderColor: auraColor } : {}}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {tab === 'songs' && renderSongsTab()}
      {tab === 'ai'    && renderAITab()}
      {tab === 'stats' && renderStatsTab()}
    </div>
  )
}