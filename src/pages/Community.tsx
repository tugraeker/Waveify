import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import { formatDuration } from '@/lib/utils'
import { Play, Heart, Send, Lightbulb, Users, CalendarDays, Sparkles } from 'lucide-react'
import type { Song } from '@/types'

type Review = { text: string; author: string; likes: number; date: number }
type RequestPost = { id: string; text: string; author: string; date: number; suggestions: { songId: string; by: string; date: number }[] }
type Confession = { text: string; likes: number; date: number }

export default function Community() {
  const { user, songs } = useStore()
  const [pool, setPool] = useState<Song[]>([])
  useEffect(() => {
    if (songs.length >= 4) { setPool(songs); return }
    supabase.from('songs').select('id,title,artist,cover_url,audio_url,album,genre,duration').limit(200).then(({ data }) => {
      if (data?.length) { setPool(data as Song[]); useStore.getState().setSongs(data as Song[]) }
    })
  }, [songs.length])

  const dailyAlbum = useMemo(() => {
    if (!pool.length) return null
    const d = new Date()
    const seed = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate()
    return pool[seed % pool.length]
  }, [pool])

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20"><Users size={20} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold">Topluluk</h1>
            <p className="text-sm text-surface-400">Günün albümü, öneriler, itiraflar ve dinleme kulübü</p>
          </div>
        </div>

        <DailyAlbumBoard album={dailyAlbum} user={user} />
        <SuggestionBoard pool={pool} user={user} />
        <ConfessionBoard user={user} />
        <ListenClub pool={pool} />
      </div>
    </div>
  )
}

function load<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || '') || fallback } catch { return fallback } }
function save(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)) }

/* 12 — Günün Albüm İncelemesi Panosu (280 karakter) */
function DailyAlbumBoard({ album, user }: { album: Song | null; user: any }) {
  const dateKey = new Date().toISOString().slice(0, 10)
  const [reviews, setReviews] = useState<Review[]>(() => load(`waveify_reviews_${dateKey}`, []))
  const [text, setText] = useState('')
  const [likedReviews, setLikedReviews] = useState<string[]>(() => load(`waveify_reviews_liked_${dateKey}`, []))
  useEffect(() => { setReviews(load(`waveify_reviews_${dateKey}`, [])) }, [dateKey])
  function post() {
    if (!text.trim()) return
    const next = [{ text: text.trim().slice(0, 280), author: user?.username || 'Misafir', likes: 0, date: Date.now() }, ...reviews]
    save(`waveify_reviews_${dateKey}`, next)
    setReviews(next); setText('')
    emitToast('İnceleme panoya eklendi', 'success')
  }
  function like(i: number) {
    const r = reviews[i]
    const id = `${r.author}-${r.date}`
    if (likedReviews.includes(id)) return
    const next = reviews.map((x, j) => j === i ? { ...x, likes: x.likes + 1 } : x)
    save(`waveify_reviews_${dateKey}`, next)
    setReviews(next)
    setLikedReviews((l) => { const nl = [...l, id]; save(`waveify_reviews_liked_${dateKey}`, nl); return nl })
  }
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4 mb-4">
        {album?.cover_url ? <img src={album.cover_url} alt="" className="w-16 h-16 rounded-xl object-cover shadow-lg" /> : <div className="w-16 h-16 rounded-xl bg-surface-800 flex items-center justify-center"><CalendarDays size={22} className="text-surface-500" /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-surface-500 uppercase tracking-wider mb-0.5">📅 Günün Albüm İnceleme Panosu</p>
          <p className="text-lg font-display font-bold text-white truncate">{album ? `${album.title} — ${album.artist}` : 'Yükleniyor...'}</p>
          <p className="text-[11px] text-surface-500">{album?.album || 'Tekli'}{album?.duration ? ` · ${formatDuration(album.duration)}` : ''}</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()}
          placeholder="280 karakterde eleştirini yaz — beğenenler seni yükseltir..."
          className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-rose-400/50" />
        <button onClick={post} className="h-9 px-4 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-colors">Yayınla</button>
      </div>
      {text.length > 0 && <p className="text-[10px] text-surface-500 mb-3">{text.length}/280</p>}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {reviews.length === 0 && <p className="text-center text-sm text-surface-500 py-6">Bu albümü daha kimse incelemedi — ilk eleştirmen ol! ✍️</p>}
        {reviews.map((r, i) => (
          <div key={i} className={`bg-surface-800/50 rounded-xl px-3.5 py-2.5 ${i === 0 ? 'border border-rose-500/30' : 'border border-transparent'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">{r.text}</p>
                <p className="text-[10px] text-surface-500 mt-1">{r.author} · {new Date(r.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => like(i)} className={`flex items-center gap-1 text-xs font-bold shrink-0 px-2 py-1 rounded-lg transition-colors ${likedReviews.includes(`${r.author}-${r.date}`) ? 'text-rose-400' : 'text-surface-500 hover:text-rose-400'}`}>
                <Heart size={12} fill={likedReviews.includes(`${r.author}-${r.date}`) ? 'currentColor' : 'none'} /> {r.likes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 23 — Topluluk Şarkı Önerisi Panosu */
function SuggestionBoard({ pool, user }: { pool: Song[]; user: any }) {
  const [posts, setPosts] = useState<RequestPost[]>(() => load('waveify_requests', []))
  const [text, setText] = useState('')
  const [picking, setPicking] = useState<string | null>(null)
  const [songPick, setSongPick] = useState('')
  function post() {
    if (!text.trim()) return
    const next = [{ id: `${Date.now()}`, text: text.trim().slice(0, 200), author: user?.username || 'Misafir', date: Date.now(), suggestions: [] }, ...posts]
    save('waveify_requests', next.slice(0, 30)); setPosts(next); setText('')
    emitToast('Panoya eklendi', 'success')
  }
  function suggest(postId: string) {
    if (!songPick) return
    const song = pool.find((s) => s.id === songPick)
    const next = posts.map((p) => p.id === postId ? { ...p, suggestions: [...p.suggestions, { songId: songPick, by: user?.username || 'Misafir', date: Date.now() }] } : p)
    save('waveify_requests', next); setPosts(next); setSongPick(''); setPicking(null)
    emitToast(`${song?.title || 'Şarkı'} önerildi 🎧`, 'success')
  }
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold text-white mb-1">📢 Topluluk Şarkı Önerisi Panosu</p>
      <p className="text-xs text-surface-500 mb-4">"Şuna benzer bir şey arıyorum" de, topluluk katalogdan önersin.</p>
      <div className="flex gap-2 mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()}
          placeholder="Öneri isteğini yaz... (ör: 90'lar rock nostaljisi)" className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-cyan-400/50" />
        <button onClick={post} className="h-9 px-4 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-colors">İste</button>
      </div>
      <div className="space-y-2.5">
        {posts.length === 0 && <p className="text-center text-sm text-surface-500 py-5">Panoda istek yok — müzik bilgisini paylaş!</p>}
        {posts.map((p) => (
          <div key={p.id} className="bg-surface-800/50 rounded-xl p-3">
            <p className="text-sm text-white">{p.text}</p>
            <p className="text-[10px] text-surface-500 mt-1 mb-2">{p.author} · {new Date(p.date).toLocaleDateString('tr-TR')}</p>
            {p.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {p.suggestions.map((sg, i) => {
                  const s = pool.find((x) => x.id === sg.songId)
                  return s ? <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">🎧 {s.title} <span className="text-surface-500">— {sg.by}</span></span> : null
                })}
              </div>
            )}
            {picking === p.id ? (
              <div className="flex gap-2">
                <select value={songPick} onChange={(e) => setSongPick(e.target.value)} className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-2 text-xs text-white outline-none">
                  <option value="">Şarkı seç...</option>
                  {pool.slice(0, 120).map((s) => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
                </select>
                <button onClick={() => suggest(p.id)} className="h-8 px-3 rounded-lg bg-cyan-500 text-white text-xs font-semibold"><Send size={11} className="inline mr-1" />Öner</button>
              </div>
            ) : (
              <button onClick={() => { setPicking(p.id); setSongPick('') }} className="text-[11px] text-cyan-400 hover:text-cyan-300"><Lightbulb size={11} className="inline mr-1" />Şarkı öner</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* 180 — Müziksel İtiraf Kutusu (anonim) */
function ConfessionBoard({ user }: { user: any }) {
  const [confessions, setConfessions] = useState<Confession[]>(() => load('waveify_confessions', []))
  const [text, setText] = useState('')
  const [likedIds, setLikedIds] = useState<string[]>(() => load('waveify_confessions_liked', []))
  function post() {
    if (!text.trim()) return
    const next = [{ text: text.trim().slice(0, 160), likes: 0, date: Date.now() }, ...confessions]
    save('waveify_confessions', next.slice(0, 40)); setConfessions(next); setText('')
    emitToast('İtirafın kutuya düştü 🤫', 'success')
  }
  function like(i: number) {
    const id = String(confessions[i].date)
    if (likedIds.includes(id)) return
    const next = confessions.map((c, j) => j === i ? { ...c, likes: c.likes + 1 } : c)
    save('waveify_confessions', next); setConfessions(next)
    setLikedIds((l) => { const nl = [...l, id]; save('waveify_confessions_liked', nl); return nl })
  }
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-white">🤫 Müziksel İtiraf Kutusu</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">Anonim</span>
      </div>
      <p className="text-xs text-surface-500 mb-4">Kendini ele vermeden itiraf et — kimse kim olduğunu bilemez.</p>
      <div className="flex gap-2 mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()}
          placeholder="İtirafın: 'Mikrofonla şarkı söylediğimde komşular kaçıyor'..." className="flex-1 h-9 rounded-xl bg-surface-800 border border-surface-700 px-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-purple-400/50" />
        <button onClick={post} className="h-9 px-4 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-400 transition-colors">İtiraf Et</button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {confessions.length === 0 && <p className="text-center text-sm text-surface-500 py-5">Kutu bomboş — ilk itirafı sen yap.</p>}
        {confessions.map((c, i) => (
          <div key={i} className="bg-surface-800/40 rounded-xl px-3.5 py-2.5">
            <div className="flex items-start gap-3">
              <p className="text-sm text-surface-200 italic flex-1">"{c.text}"</p>
              <button onClick={() => like(i)} className={`flex items-center gap-1 text-xs font-bold shrink-0 px-2 py-1 rounded-lg transition-colors ${likedIds.includes(String(c.date)) ? 'text-purple-400' : 'text-surface-500 hover:text-purple-400'}`}>
                <Heart size={12} fill={likedIds.includes(String(c.date)) ? 'currentColor' : 'none'} /> {c.likes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 197 — Canlı Dinleme Kulübü */
function ListenClub({ pool }: { pool: Song[] }) {
  const { setQueue, setCurrentSong, setIsPlaying } = useStore()
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const target = useMemo(() => {
    const d = new Date(now)
    const day = d.getDay()
    let daysUntil = (5 - day + 7) % 7
    if (daysUntil === 0) { const hh = d.getHours() * 60 + d.getMinutes(); if (hh >= 1260) daysUntil = 7 }
    const t = new Date(d)
    t.setDate(t.getDate() + daysUntil)
    t.setHours(21, 0, 0, 0)
    return t
  }, [now])
  const diff = target.getTime() - now.getTime()
  const hh = Math.floor(diff / 3600000), mm = Math.floor((diff % 3600000) / 60000), ss = Math.floor((diff % 60000) / 1000)
  const featured = useMemo(() => {
    if (!pool.length) return null
    const seed = new Date().getFullYear() * 100 + new Date().getMonth()
    return pool[(seed * 7 + 13) % pool.length]
  }, [pool])
  function join() {
    if (!featured) return
    const sameArtist = pool.filter((s) => s.artist === featured.artist)
    const list = sameArtist.length > 1 ? sameArtist : pool.slice(0, 10)
    setQueue(list)
    setCurrentSong(featured)
    setIsPlaying(true)
    emitToast(`🎉 ${featured.artist} kulübüne katıldın!`, 'success')
  }
  return (
    <div className="glass rounded-2xl p-5 bg-gradient-to-r from-fuchsia-500/5 via-transparent to-wave-500/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-wave-500 flex items-center justify-center"><Sparkles size={16} className="text-white" /></div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Cuma 21:00 — Canlı Dinleme Kulübü</p>
          <p className="text-[11px] text-surface-500">Her Cuma gecesi topluluk tek sanatçıyı birlikte dinler</p>
        </div>
        {featured ? (
          <button onClick={join} className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-wave-500 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/20 hover:scale-105 transition-transform">Katıl ve Dinle</button>
        ) : <button disabled className="px-4 py-2 rounded-xl bg-surface-800 text-surface-500 text-xs font-bold">Yükleniyor...</button>}
      </div>
      <div className="flex items-center gap-2 font-mono text-2xl font-bold text-white">
        <span className="bg-surface-950/60 rounded-xl px-3 py-1.5">{String(hh).padStart(2, '0')}</span><span className="text-surface-600">:</span>
        <span className="bg-surface-950/60 rounded-xl px-3 py-1.5">{String(mm).padStart(2, '0')}</span><span className="text-surface-600">:</span>
        <span className="bg-surface-950/60 rounded-xl px-3 py-1.5">{String(ss).padStart(2, '0')}</span>
        <span className="text-xs text-surface-500 ml-3 font-sans">kaldı</span>
      </div>
      {featured && (
        <p className="text-xs text-surface-400 mt-3">Bu ayın sanatçısı: <b className="text-white">{featured.artist}</b> — ilk şarkı: <b className="text-fuchsia-300">{featured.title}</b></p>
      )}
    </div>
  )
}
