import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { UserPlus, UserCheck, Clock, X, Users, Search, Trash2, Ban, Circle, Radio, Swords, FlaskConical } from 'lucide-react'
import { trackFriend, awardXp } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'
import { compatLabel, jaccard, personaFromGenres } from '@/lib/social'
import type { User } from '@/types'

interface FriendUser { id: string; username: string; email?: string; last_seen?: string }
interface PendingReq { id: string; user_id: string; friend_id: string; status: string; created_at: string; user?: { id: string; username: string }; friend?: { id: string; username: string } }

export default function FriendsPage() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingReq[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<PendingReq[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [blockedUsers, setBlockedUsers] = useState<FriendUser[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [compat, setCompat] = useState<Record<string, number>>({})
  const [compatLoading, setCompatLoading] = useState(false)
  const [radioLoading, setRadioLoading] = useState<string | null>(null)
  const [battle, setBattle] = useState<{ friend: FriendUser; text: string[] } | null>(null)
  const [blendSel, setBlendSel] = useState<Set<string>>(new Set())
  const [blendLoading, setBlendLoading] = useState(false)

  useEffect(() => { if (user) { fetchFriends(); fetchBlocked() } }, [user])

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`https://${import.meta.env.VITE_SOCKET_URL || 'localhost'}:${import.meta.env.VITE_SOCKET_PORT || 3001}/api/online-users`).then(r => r.json()).then(setOnlineUsers).catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFriends() {
    try {
      // NOTE: do not request `last_seen` — users table has no such column and PostgREST
      // would fail the whole embed query (breaking the friend list silently).
      const { data: sent } = await supabase.from('friends').select('*, friend:friend_id(id, username, email, avatar_url)').eq('user_id', user?.id).eq('status', 'accepted')
      const { data: received } = await supabase.from('friends').select('*, user:user_id(id, username, email, avatar_url)').eq('friend_id', user?.id).eq('status', 'accepted')
      const { data: pending } = await supabase.from('friends').select('*, user:user_id(id, username)').eq('friend_id', user?.id).eq('status', 'pending')
      const { data: outgoing } = await supabase.from('friends').select('*, friend:friend_id(id, username)').eq('user_id', user?.id).eq('status', 'pending')
      const allFriends: FriendUser[] = []
      sent?.forEach((f: any) => f.friend && allFriends.push(f.friend))
      received?.forEach((f: any) => f.user && allFriends.push(f.user))
      setFriends(allFriends)
      setPendingRequests((pending || []) as any)
      setOutgoingRequests((outgoing || []) as any)
      loadCompat(allFriends)
    } catch (err: any) { setError(err.message) }
  }

  async function loadCompat(friendList: FriendUser[]) {
    if (!user || friendList.length === 0) { setCompat({}); return }
    setCompatLoading(true)
    try {
      const { data: myLikes } = await supabase.from('likes').select('song_id').eq('user_id', user.id)
      const mine = new Set((myLikes || []).map((l: any) => l.song_id))
      const next: Record<string, number> = {}
      for (const f of friendList) {
        try {
          const { data: theirLikes } = await supabase.from('likes').select('song_id').eq('user_id', f.id)
          const theirs = new Set((theirLikes || []).map((l: any) => l.song_id))
          const j = jaccard(mine, theirs)
          const { data: myHist } = await supabase.from('listen_history').select('song:songs(id)').eq('user_id', user.id).limit(100)
          const { data: theirHist } = await supabase.from('listen_history').select('song:songs(id)').eq('user_id', f.id).limit(100)
          const myIds = new Set((myHist || []).map((h: any) => h.song?.id).filter(Boolean))
          const theirIds = new Set((theirHist || []).map((h: any) => h.song?.id).filter(Boolean))
          const hj = jaccard(myIds, theirIds)
          const pct = Math.round(Math.min(100, Math.max(5, j * 70 + hj * 30)))
          next[f.id] = pct
        } catch { next[f.id] = 0 }
      }
      setCompat(next)
    } catch {} finally { setCompatLoading(false) }
  }
  async function fetchBlocked() {
    const { data } = await supabase.from('blocks').select('blocked_id, blocked:blocked_id(id, username)').eq('user_id', user?.id)
    if (data) setBlockedUsers(data.map((b: any) => b.blocked).filter(Boolean))
  }

  /* 132 — Blend: seçilen arkadaşların zevklerini tek akışta karıştır */
  async function createBlend() {
    if (!user || blendSel.size === 0) { emitToast('En az bir arkadaş seç', 'info'); return }
    setBlendLoading(true)
    try {
      const picked = friends.filter((f) => blendSel.has(f.id)).slice(0, 3)
      const perFriend = Math.ceil(24 / picked.length)
      const ids: string[] = []
      for (const f of picked) {
        const { data: hist } = await supabase.from('listen_history').select('song:songs(id)').eq('user_id', f.id).limit(60)
        const fids = [...new Set((hist || []).map((h: any) => h.song?.id).filter(Boolean))] as string[]
        ids.push(...fids.slice(0, perFriend))
      }
      const unique = [...new Set(ids)]
      if (!unique.length) { emitToast('Arkadaşlarının dinleme geçmişi yok', 'info'); setBlendLoading(false); return }
      const { data: songs } = await supabase.from('songs').select('*').in('id', unique).limit(60)
      const list = (songs || []).sort(() => Math.random() - 0.5)
      if (!list.length) { emitToast('Şarkılar bulunamadı', 'error'); setBlendLoading(false); return }
      useStore.getState().setQueue(list)
      useStore.getState().setCurrentSong(list[0])
      useStore.getState().setIsPlaying(true)
      emitToast(`🧪 Blend hazır: ${picked.map((f) => f.username).join(' + ')} (${list.length} şarkı)`, 'success')
      setBlendSel(new Set())
    } catch { emitToast('Blend oluşturulamadı', 'error') }
    setBlendLoading(false)
  }

  /* 6 — Arkadaş Radyosu: arkadaşın dinlediklerinden karışık akış */
  async function startFriendRadio(friend: FriendUser) {
    if (!user) return
    setRadioLoading(friend.id)
    try {
      const { data: hist } = await supabase.from('listen_history').select('song:songs(id)').eq('user_id', friend.id).limit(80)
      const ids = [...new Set((hist || []).map((h: any) => h.song?.id).filter(Boolean))] as string[]
      if (!ids.length) { emitToast('Arkadaşın henüz dinleme geçmişi yok', 'info'); setRadioLoading(null); return }
      const { data: songs } = await supabase.from('songs').select('*').in('id', ids).limit(80)
      const list = songs || []
      if (!list.length) { emitToast('Şarkılar bulunamadı', 'error'); setRadioLoading(null); return }
      const shuffled = [...list].sort(() => Math.random() - 0.5)
      useStore.getState().setQueue(shuffled)
      useStore.getState().setCurrentSong(shuffled[0])
      useStore.getState().setIsPlaying(true)
      emitToast(`📻 ${friend.username} radyosu yayında!`, 'success')
    } catch { emitToast('Radyo başlatılamadı', 'error') }
    setRadioLoading(null)
  }

  /* 185 — Müzik Zevki Kapışması: komik rap savaşı */
  async function battleTaste(friend: FriendUser) {
    if (!user) return
    try {
      const { data: myLikes } = await supabase.from('likes').select('song:songs(genre)').eq('user_id', user.id).limit(150)
      const { data: theirLikes } = await supabase.from('likes').select('song:songs(genre)').eq('user_id', friend.id).limit(150)
      const countGenres = (rows: any[]) => {
        const m = new Map<string, number>()
        for (const r of rows) { const g = r.song?.genre || 'bilinmeyen'; m.set(g, (m.get(g) || 0) + 1) }
        return Object.fromEntries(m)
      }
      const me = personaFromGenres(countGenres(myLikes || []))
      const them = personaFromGenres(countGenres(theirLikes || []))
      const punch: Record<string, string> = {
        'Rock Yıldızı': 'gitarımı bir akor bile çalmadan kalbiniz yanıyor',
        'Pop Parlayan': 'liste başı koltukta senden önce oturdum',
        'Ritim Ustası': 'beat yarışında 808\'ler konuşur, laf değil',
        'Gece Kuşu': 'saksafonum sabah 4\'te bile swinger',
        'Sahne Asili': 'senin zevkin prelüd, benimki konçerto',
        'Gelecekçi': 'sen 8-bit\'te takılırken ben sentezdeyim',
        'Duygusal Ruh': 'hüznünde bile ritim var, kıskandım',
        'Anadolu Ruhu': 'köklerimi dinle, meydan okuman zayıf',
        'Ses Dalgacı': 'ambient\'la bile seni ters köşeye yatırırım',
      }
      const lines = [
        `🎤 RAP SAVAŞI: ${user.username} vs ${friend.username}`,
        `${user.username} (${me.emoji} ${me.title}): "${punch[me.title] || 'müzik zevkim seni ezer'}"`,
        `${friend.username} (${them.emoji} ${them.title}): "${punch[them.title] || 'senin listen modası geçmiş'}"`,
        `${user.username}: "Uyumumuz %${compat[friend.id] || '?'} ama taht benim — çünkü ${me.desc.split('.')[0]}"`,
        `${friend.username}: "Senin türünle benim beat\'im birleşince ortalık yıkılır!"`,
        `🏆 Kazanan: ${compat[friend.id] >= 50 ? 'Berabere — ikiniz de efsane dinliyorsunuz!' : user.username + ' (bu turda)'}`,
      ]
      setBattle({ friend, text: lines })
    } catch { emitToast('Kapışma başlatılamadı', 'error') }
  }

  async function searchUser() {
    if (!searchQuery.trim()) return
    setSearching(true); setError(''); setSearchResults([])
    try {
      const { data } = await supabase.from('users').select('id, username, email').or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`).limit(10)
      if (!data || data.length === 0) { setError('Kullanıcı bulunamadı'); setSearching(false); return }
      setSearchResults(data.filter((u) => u.id !== user?.id))
    } catch (err: any) { setError(err.message) } finally { setSearching(false) }
  }

  async function sendRequest(friendId: string) {
    if (!user) return
    const { error: e } = await supabase.from('friends').insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
    if (e) {
      if (e.code === '23505') setError('İstek zaten gönderilmiş — aşağıdaki "Gönderilen İstekler" bölümünde bekliyor.')
      else setError(e.message)
      return
    }
    emitToast('Arkadaşlık isteği gönderildi ✅', 'success')
    setSearchResults([]); setSearchQuery('')
    fetchFriends()
  }

  async function cancelRequest(friendUserId: string) {
    if (!user) return
    await supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendUserId)
    fetchFriends()
  }

  async function acceptRequest(friendUserId: string) {
    if (!user) return
    await supabase.from('friends').update({ status: 'accepted' }).eq('user_id', friendUserId).eq('friend_id', user.id)
    trackFriend()
    awardXp(15)
    fetchFriends()
  }

  async function rejectRequest(friendUserId: string) {
    if (!user) return
    await supabase.from('friends').delete().eq('user_id', friendUserId).eq('friend_id', user.id)
    fetchFriends()
  }

  async function removeFriend(friendId: string) {
    if (!user) return
    await supabase.from('friends').delete().or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`).eq('status', 'accepted')
    fetchFriends()
  }

  async function handleBlock(targetId: string) {
    if (!user) return
    try { await supabase.from('blocks').insert({ user_id: user.id, blocked_id: targetId }) } catch {}
    removeFriend(targetId)
    fetchBlocked()
  }

  async function handleUnblock(targetId: string) {
    if (!user) return
    await supabase.from('blocks').delete().eq('user_id', user.id).eq('blocked_id', targetId)
    fetchBlocked()
  }

  function isOnline(userId: string) {
    return onlineUsers.has(userId)
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6">Arkadaşlar</h1>
      <div className="max-w-xl space-y-6">
        <div className="flex gap-2">
          <Input placeholder="İsim veya e-posta ile ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUser()} />
          <Button variant="primary" onClick={searchUser} disabled={searching}><Search size={16} /></Button>
        </div>
        {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl p-3 border border-red-500/10">{error}</p>}
        {searchResults.length > 0 && (
          <div className="flex flex-col gap-2 animate-fade-in">
            {searchResults.map((sr) => (
              <div key={sr.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${sr.id}`)}>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center text-sm font-bold text-white">{sr.username[0]?.toUpperCase() || '?'}</div>
                    <Circle size={8} className={`absolute -bottom-0.5 -right-0.5 ${isOnline(sr.id) ? 'text-green-400' : 'text-surface-600'}`} fill={isOnline(sr.id) ? '#22c55e' : '#52525b'} />
                  </div>
                  <div><p className="text-sm font-medium">{sr.username}</p><p className="text-xs text-surface-400">{sr.email}</p></div>
                </div>
                <Button size="sm" onClick={() => sendRequest(sr.id)}><UserPlus size={14} /> Ekle</Button>
              </div>
            ))}
          </div>
        )}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} /> Gelen İstekler</h2>
            <div className="flex flex-col gap-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-surface-900/50 border border-surface-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${req.user_id}`)}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center text-xs font-bold text-white">{req.user?.username?.[0]?.toUpperCase() || '?'}</div>
                    <p className="text-sm text-white font-medium">{req.user?.username || 'Bilinmeyen Kullanıcı'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => acceptRequest(req.user_id)}><UserCheck size={14} /> Kabul</Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectRequest(req.user_id)}><X size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {outgoingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2"><UserPlus size={14} /> Gönderilen İstekler ({outgoingRequests.length})</h2>
            <div className="flex flex-col gap-2">
              {outgoingRequests.map((req) => (
                <div key={req.id} className="bg-surface-900/30 border border-surface-800/50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${req.friend_id}`)}>
                    <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-300">{req.friend?.username?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <p className="text-sm text-white font-medium">{req.friend?.username || 'Bilinmeyen Kullanıcı'}</p>
                      <p className="text-[10px] text-amber-400/80">⏳ Kabul bekleniyor</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => cancelRequest(req.friend_id)}><X size={14} /> İptal</Button>
                </div>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Arkadaşların ({friends.length})</h2>
          {friends.length > 1 && (
            <div className="glass rounded-xl p-3 mb-3 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical size={14} className="text-violet-400" />
                <p className="text-xs font-bold text-white">Arkadaş Blend'i</p>
                <p className="text-[10px] text-surface-500 flex-1 text-right">{blendSel.size} seçili</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {friends.slice(0, 8).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const next = new Set(blendSel)
                      if (next.has(f.id)) next.delete(f.id); else next.add(f.id)
                      setBlendSel(next)
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all ${blendSel.has(f.id) ? 'bg-violet-500/25 border-violet-500/50 text-violet-200' : 'bg-surface-800/70 border-surface-700 text-surface-300 hover:border-violet-500/40'}`}
                  >
                    {f.username}
                  </button>
                ))}
              </div>
              <button onClick={createBlend} disabled={blendLoading || blendSel.size === 0} className="w-full py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
                {blendLoading ? 'Karıştırılıyor...' : '🧪 Blend Karıştır ve Çal'}
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-surface-500 glass rounded-2xl border-dashed"><Users size={36} className="mb-3 opacity-30" /><p className="text-sm">Henüz arkadaşın yok</p><p className="text-xs mt-1 text-surface-600">İsim veya e-posta ile arkadaşlarını bul</p></div>
            ) : friends.map((f) => (
              <div key={f.id} className="glass rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface-800/60 transition-colors group">
                <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${f.id}`)}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500/30 to-wave-400/30 flex items-center justify-center text-sm font-bold text-wave-400">{f.username?.[0]?.toUpperCase() || '?'}</div>
                  <Circle size={8} className={`absolute -bottom-0.5 -right-0.5 ${isOnline(f.id) ? 'text-green-400' : 'text-surface-600'}`} fill={isOnline(f.id) ? '#22c55e' : '#52525b'} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${f.id}`)}>
                  <p className="text-sm font-medium text-white truncate">{f.username}</p>
                  <p className="text-xs text-surface-500 truncate">{f.email}</p>
                  {compat[f.id] !== undefined && (
                    <span className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${compatLabel(compat[f.id]).cls}`}>
                      {compatLoading ? '…' : `${compat[f.id]}% uyum · ${compatLabel(compat[f.id]).text}`}
                    </span>
                  )}
                </div>
                <button onClick={() => startFriendRadio(f)} disabled={radioLoading === f.id} className="p-2 rounded-lg text-wave-400/80 hover:text-wave-300 hover:bg-wave-500/10 transition-all disabled:opacity-40" title="Arkadaş Radyosu — onun dinlediklerini çal">
                  <Radio size={14} className={radioLoading === f.id ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => battleTaste(f)} className="p-2 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-all" title="Zevk Kapışması — rap savaşı">
                  <Swords size={14} />
                </button>
                <button onClick={() => handleBlock(f.id)} className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Engelle">
                  <Ban size={14} />
                </button>
                <button onClick={() => removeFriend(f.id)} className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Arkadaşlıktan Çıkar">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
        {blockedUsers.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Ban size={14} /> Engellenenler</h2>
            <div className="flex flex-col gap-2">
              {blockedUsers.map((b) => (
                <div key={b.id} className="bg-surface-900/30 border border-surface-800/50 rounded-xl p-3 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-500">{b.username?.[0]?.toUpperCase() || '?'}</div>
                    <p className="text-sm text-surface-400">{b.username}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleUnblock(b.id)}>Engeli Kaldır</Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {battle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBattle(null)}>
          <div className="w-full max-w-lg mx-4 glass rounded-3xl p-6 animate-pop-in border border-amber-500/20 shadow-2xl shadow-amber-500/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2"><Swords size={18} className="text-amber-400" /> Müzik Zevki Kapışması</h3>
              <button onClick={() => setBattle(null)} className="text-surface-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-2.5 mb-5">
              {battle.text.map((line, i) => (
                <p key={i} className={`text-sm rounded-xl px-3.5 py-2.5 leading-relaxed ${i === 0 ? 'bg-surface-800/60 text-white font-bold text-center' : i === battle.text.length - 1 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-center' : 'bg-surface-800/40 text-surface-200'}`}>{line}</p>
              ))}
            </div>
            <button onClick={() => { setBattle(null); battleTaste(battle.friend) }} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition-opacity">🔄 Remix — Tekrar Kapış</button>
          </div>
        </div>
      )}
    </div>
  )
}
