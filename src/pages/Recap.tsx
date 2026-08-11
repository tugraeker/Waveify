import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { personaFromGenres } from '@/lib/social'
import { CalendarCheck, Play, Share2, Trophy, Music, Mic, Clock } from 'lucide-react'
import type { Song } from '@/types'

type Listen = { played_at: string; song: Song | null }

export default function Recap() {
  const { user, setQueue, setCurrentSong, setIsPlaying, songHistory } = useStore()
  const [listens, setListens] = useState<Listen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    supabase
      .from('listen_history')
      .select('played_at, song:songs(*)')
      .eq('user_id', user.id)
      .gte('played_at', since)
      .order('played_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        const rows = (data || []).filter((h: any) => h.song && !Array.isArray(h.song))
        setListens(rows as unknown as Listen[])
        setLoading(false)
      })
  }, [user?.id])

  const stats = useMemo(() => {
    const songs = listens.map((l) => l.song).filter(Boolean) as Song[]
    const byId = new Map<string, Song & { count: number }>()
    let totalMs = 0
    for (const s of songs) {
      totalMs += (s.duration || 0) * 1000
      const cur = byId.get(s.id)
      if (cur) cur.count++
      else byId.set(s.id, { ...s, count: 1 })
    }
    const topSongs = [...byId.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    const artistMap = new Map<string, number>()
    for (const s of songs) artistMap.set(s.artist, (artistMap.get(s.artist) || 0) + 1)
    const topArtists = [...artistMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const genreMap = new Map<string, number>()
    for (const s of songs) { const g = s.genre || 'bilinmeyen'; genreMap.set(g, (genreMap.get(g) || 0) + 1) }
    const topGenres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const hours: number[] = new Array(24).fill(0)
    for (const l of listens) { try { hours[new Date(l.played_at).getHours()]++ } catch {} }
    let peakHour = 0
    for (let i = 1; i < 24; i++) if (hours[i] > hours[peakHour]) peakHour = i
    return { totalCount: songs.length, totalMs, topSongs, topArtists, topGenres, peakHour }
  }, [listens])

  const persona = useMemo(() => personaFromGenres(Object.fromEntries(stats.topGenres.map(([g, c]) => [g, c]))), [stats.topGenres])

  const insights = useMemo(() => {
    const out: string[] = []
    if (stats.totalCount === 0) return out
    if (stats.totalCount >= 50) out.push('🔥 Bu hafta müzik diyetinde büyük artış var — 50+ dinleme!')
    if (stats.topGenres[0]?.[0] === 'rock' || stats.topGenres[0]?.[0]?.includes('metal')) out.push('🎸 Şu an ruh halin enerji dolu — rock kanın gibi.')
    if (stats.topGenres[0]?.[0]?.includes('lo-fi') || stats.topGenres[0]?.[0]?.includes('ambient')) out.push('🌙 Sakin kalmanın formülünü bulmuşsun — lo-fi kafası.')
    if (stats.peakHour >= 22 || stats.peakHour < 4) out.push('🦉 Gece kuşusun — müzik senin gece lamban.')
    else if (stats.peakHour < 12) out.push('☀️ Gününü müzikle açıyorsun — sabah insanı.')
    const ar = stats.topArtists[0]
    if (ar) out.push(`🎤 En çok dinlediğin sanatçı: ${ar[0]} (${ar[1]} kez) — sadakat ödüllü!`)
    const dt = stats.totalMs / 1000
    if (dt >= 3600) out.push(`⏳ Toplam ${Math.round(dt / 3600)} saat müzik! Kulakların yorgun ama mutlu.`)
    out.push(persona.emoji + ' ' + persona.title + ' kimliğin bu hafta netleşti: ' + persona.desc)
    return out
  }, [stats, persona])

  function playTop() {
    if (!stats.topSongs.length) return
    const list = stats.topSongs
    setQueue(list)
    setCurrentSong(list[0])
    setIsPlaying(true)
  }
  function share() {
    const lines = [
      '📊 Waveify Haftalık Özetim',
      `🎧 ${stats.totalCount} dinleme · ${Math.round(stats.totalMs / 3600000)} saat`,
      '🏆 En çok: ' + (stats.topSongs[0] ? `${stats.topSongs[0].title} — ${stats.topSongs[0].artist}` : '-'),
      '👑 Sanatçı: ' + (stats.topArtists[0]?.[0] || '-'),
      '🕐 Zirve saati: ' + stats.peakHour + ':00',
      persona.emoji + ' ' + persona.title,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    const toast = document.createElement('div')
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-white shadow-2xl animate-fade-in'
    toast.textContent = 'Özet kopyalandı — paylaşmaya hazır'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1800)
  }

  if (loading) return <div className="p-8 text-center text-surface-500 text-sm">Özet hazırlanıyor...</div>
  if (!user) return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-surface-500">
      <CalendarCheck size={40} className="opacity-40 mb-4" />
      <p className="text-lg font-medium">Haftalık özet için giriş yapmalısın</p>
      <p className="text-sm text-surface-500 mt-2">Dinleme geçmişin buradan toplanır</p>
    </div>
  )
  if (stats.totalCount === 0) return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-surface-500">
      <CalendarCheck size={40} className="opacity-40 mb-4" />
      <p className="text-lg font-medium">Bu hafta henüz dinleme yok</p>
      <p className="text-sm text-surface-500 mt-2">Biraz müzik aç, hafta sonunda hazır olur 🎵</p>
    </div>
  )

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"><CalendarCheck size={20} className="text-white" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Haftalık Özet</h1>
            <p className="text-sm text-surface-400">Son 7 günün müzik raporu</p>
          </div>
          <button onClick={share} className="px-4 py-2 rounded-xl bg-surface-800 border border-surface-700 text-sm text-surface-300 hover:text-white flex items-center gap-1.5 transition-colors"><Share2 size={14} /> Paylaş</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4 text-center">
            <Music size={18} className="mx-auto text-wave-400 mb-1.5" />
            <p className="text-2xl font-display font-bold text-white">{stats.totalCount}</p>
            <p className="text-[11px] text-surface-500">dinleme</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <Clock size={18} className="mx-auto text-wave-400 mb-1.5" />
            <p className="text-2xl font-display font-bold text-white">{(stats.totalMs / 3600000).toFixed(1)}s</p>
            <p className="text-[11px] text-surface-500">saat</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <Trophy size={18} className="mx-auto text-amber-400 mb-1.5" />
            <p className="text-2xl font-display font-bold text-white truncate">{stats.topArtists[0]?.[0]?.slice(0, 12) || '-'}</p>
            <p className="text-[11px] text-surface-500">en çok dinlenen</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <Mic size={18} className="mx-auto text-fuchsia-400 mb-1.5" />
            <p className="text-2xl font-display font-bold text-white">{String(stats.peakHour).padStart(2, '0')}:00</p>
            <p className="text-[11px] text-surface-500">zirve saati</p>
          </div>
        </div>

        {/* 139 — Kişisel Dinleme Analisti */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-3">🧠 Dinleme Analisti</p>
          <div className="space-y-2">
            {insights.map((t, i) => (
              <p key={i} className="text-sm text-surface-300 bg-surface-800/40 rounded-xl px-3.5 py-2.5">{t}</p>
            ))}
          </div>
        </div>

        {/* 15 — Haftalık özet kartları */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">🏆 En Çok Dinlediklerin</p>
              <button onClick={playTop} className="text-xs text-wave-400 hover:text-wave-300 flex items-center gap-1"><Play size={11} /> Çal</button>
            </div>
            <div className="space-y-2">
              {stats.topSongs.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-surface-500">{i + 1}</span>
                  {s.cover_url ? <img src={s.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center"><Music size={14} className="text-surface-500" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.title}</p>
                    <p className="text-[11px] text-surface-500 truncate">{s.artist}</p>
                  </div>
                  <span className="text-xs font-bold text-wave-400">{s.count}×</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-3">👑 Sanatçı Sıralaması</p>
            <div className="space-y-2">
              {stats.topArtists.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-surface-500">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{name}</p>
                    <div className="h-1.5 bg-surface-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${(count / stats.topArtists[0][1]) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-surface-400">{count}×</span>
                </div>
              ))}
            </div>
            {stats.topGenres.length > 0 && (
              <div className="mt-4 pt-3 border-t border-surface-800">
                <p className="text-xs text-surface-500 mb-2">Tür dağılımı</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.topGenres.map(([g, c]) => (
                    <span key={g} className="text-[11px] px-2.5 py-1 rounded-lg bg-wave-500/10 border border-wave-500/25 text-wave-300">{g} · {c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-surface-600 text-center pb-4">Özet her pazartesi sıfırlanır · son 7 günün verileri</p>
      </div>
    </div>
  )
}
