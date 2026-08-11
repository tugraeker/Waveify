import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { emitToast } from '@/hooks/useToast'
import { Play, Sunrise, Moon, GitMerge, Timer } from 'lucide-react'
import type { Song } from '@/types'

function usePool(): Song[] {
  const songs = useStore((s) => s.songs)
  const [pool, setPool] = useState<Song[]>(songs)
  useEffect(() => {
    if (songs.length >= 10) { setPool(songs); return }
    supabase.from('songs').select('id,title,artist,cover_url,audio_url,album,genre,duration').not('audio_url', 'is', null).limit(200).then(({ data }) => {
      if (data?.length) { setPool(data as Song[]); useStore.getState().setSongs(data as Song[]) }
    })
  }, [songs.length])
  return pool.length >= 10 ? pool : (songs.length >= 10 ? songs : pool)
}

function playList(list: Song[]) {
  if (!list.length) { emitToast('Uygun şarkı bulunamadı', 'error'); return }
  useStore.getState().setQueue(list)
  useStore.getState().setCurrentSong(list[0])
  useStore.getState().setIsPlaying(true)
}

function MiniCard({ title, icon, sub, children }: { title: string; icon: React.ReactNode; sub: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4 border border-wave-500/15">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-sm font-bold text-white">{title}</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-3">{sub}</p>
      {children}
    </div>
  )
}

/* 136 — Gün Dönümü Akışı: saate göre ruh hali akışı */
export function DayFlowCard() {
  const pool = usePool()
  const [mood, setMood] = useState<'sunrise' | 'day' | 'sunset'>('day')
  useEffect(() => {
    const h = new Date().getHours()
    setMood(h >= 5 && h < 11 ? 'sunrise' : h >= 11 && h < 18 ? 'day' : 'sunset')
  }, [])
  const MOODS: Record<string, { label: string; icon: string; genres: string[] }> = {
    sunrise: { label: 'Gün Doğuşu Akışı', icon: '🌅', genres: ['lo-fi', 'ambient', 'chill', 'akustik', 'folk'] },
    day: { label: 'Gündüz Enerji Akışı', icon: '☀️', genres: ['pop', 'rock', 'dans', 'elektronik'] },
    sunset: { label: 'Gün Batımı Akışı', icon: '🌙', genres: ['ambient', 'jazz', 'blues', 'lo-fi', 'sanat'] },
  }
  const meta = MOODS[mood]
  function play() {
    const list = pool.filter((s) => meta.genres.some((g) => (s.genre || '').toLowerCase().includes(g)))
    const rest = pool.filter((s) => !list.includes(s))
    const out = [...list.slice(0, 10), ...rest.slice(0, 2)].sort(() => Math.random() - 0.5)
    playList(out)
    emitToast(`${meta.icon} ${meta.label} başladı`, 'success')
  }
  return (
    <MiniCard title={meta.label} icon={<span className="text-lg">{meta.icon}</span>} sub="Saat dilimine göre otomatik ruh hali">
      <button onClick={play} className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-surface-950 text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Play size={13} fill="currentColor" /> Bu Akışı Çal</button>
      <p className="text-[10px] text-surface-600 mt-2">{meta.genres.join(', ')}</p>
    </MiniCard>
  )
}

/* 141 — Tür Köprüsü: iki tür arasında geçiş rotası */
export function GenreBridgeCard() {
  const pool = usePool()
  const genres = useMemo(() => [...new Set(pool.map((s) => s.genre).filter(Boolean))] as string[], [pool])
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  function bridge() {
    if (!a || !b || a === b) { emitToast('Farklı iki tür seç', 'info'); return }
    const fromA = pool.filter((s) => (s.genre || '').toLowerCase().includes(a.toLowerCase())).slice(0, 4)
    const fromB = pool.filter((s) => (s.genre || '').toLowerCase().includes(b.toLowerCase())).slice(0, 4)
    const others = pool.filter((s) => !fromA.includes(s) && !fromB.includes(s))
    const mid = others.slice(0, 3)
    const route = [...fromA, ...mid, ...fromB]
    playList(route)
    emitToast(`🌉 ${a} → ${b} köprüsü kuruldu (${route.length} şarkı)`, 'success')
  }
  return (
    <MiniCard title="Tür Köprüsü" icon={<GitMerge size={15} className="text-cyan-400" />} sub="İki tür arasında yumuşak geçiş rotası çiz">
      <div className="flex gap-2 mb-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-2 text-xs text-white outline-none min-w-0">
          <option value="">Başlangıç türü...</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-surface-600 text-xs self-center">→</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-2 text-xs text-white outline-none min-w-0">
          <option value="">Hedef tür...</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <button onClick={bridge} className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Play size={13} fill="currentColor" /> Köprüyü Çal</button>
    </MiniCard>
  )
}

/* 143 — Zaman Ayarlı Akış: N dakikalık yolculuk */
export function TimedFlowCard() {
  const pool = usePool()
  const [minutes, setMinutes] = useState(20)
  function play() {
    const target = minutes * 60
    const sorted = [...pool].sort((x, y) => Math.abs((x.duration || 0) - (y.duration || 0)))
    const list: Song[] = []
    let total = 0
    for (const s of sorted) {
      if (total + (s.duration || 0) > target + 20 && list.length >= 3) break
      if (list.length >= 15) break
      list.push(s); total += s.duration || 0
    }
    playList(list)
    emitToast(`⏱️ ${minutes} dakikalık yolculuk: ${list.length} şarkı (~${Math.round(total / 60)} dk)`, 'success')
  }
  return (
    <MiniCard title="Zaman Ayarlı Akış" icon={<Timer size={15} className="text-emerald-400" />} sub="Süresi tam istediğin gibi bir akış kur">
      <div className="flex items-center gap-3 mb-2">
        <input type="range" min={5} max={60} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="flex-1 accent-emerald-400" />
        <span className="text-sm font-bold text-white w-12 text-right">{minutes} dk</span>
      </div>
      <button onClick={play} className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Play size={13} fill="currentColor" /> Yolculuğu Başlat</button>
    </MiniCard>
  )
}

export function FlowToolsSection() {
  const h = new Date().getHours()
  const isNight = h >= 20 || h < 5
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        {isNight ? <Moon size={16} className="text-indigo-400" /> : <Sunrise size={16} className="text-amber-400" />}
        <h2 className="text-lg font-bold">Akıllı Akışlar</h2>
        <p className="text-xs text-surface-500 hidden sm:block">Saatine, zevkine ve zamanına göre akışlar</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DayFlowCard />
        <GenreBridgeCard />
        <TimedFlowCard />
      </div>
    </section>
  )
}
