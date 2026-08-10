import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { UserPlus, UserCheck, Clock, X, Users, Search, Trash2, Ban, Circle, Siren, Send } from 'lucide-react'
import { trackFriend, awardXp } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'
import { sendTroll, TROLL_TEMPLATES, type TrollMessage } from '@/lib/troll'
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
  const [trollTarget, setTrollTarget] = useState<FriendUser | null>(null)
  const [trollText, setTrollText] = useState('')
  const [trollTone, setTrollTone] = useState('scary')
  const [sendingTroll, setSendingTroll] = useState(false)

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
    } catch (err: any) { setError(err.message) }
  }

  async function fetchBlocked() {
    const { data } = await supabase.from('blocks').select('blocked_id, blocked:blocked_id(id, username)').eq('user_id', user?.id)
    if (data) setBlockedUsers(data.map((b: any) => b.blocked).filter(Boolean))
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

  async function handleSendTroll() {
    if (!user || !trollTarget) return
    const tmpl = TROLL_TEMPLATES.find((t) => t.text === trollText.trim()) || {
      emoji: '🚨', text: trollText.trim() || TROLL_TEMPLATES[0].text,
      tone: (['scary', 'cute', 'warning', 'party'].includes(trollTone) ? (trollTone === 'scary' ? 'red' : trollTone === 'cute' ? 'pink' : trollTone === 'warning' ? 'amber' : 'cyan') : 'red') as TrollMessage['tone'],
    }
    setSendingTroll(true)
    sendTroll(trollTarget.id, tmpl.emoji, tmpl.text, tmpl.tone, user.username || 'Biri')
    setSendingTroll(false)
    emitToast(`📢 ${trollTarget.username}'a uyarı gönderildi!`, 'success')
    setTrollTarget(null)
    setTrollText('')
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
                  {f.email && <p className="text-xs text-surface-500 truncate">{f.email}</p>}
                </div>
                <button onClick={() => setTrollTarget(f)} className="p-2 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all animate-pulse" title="Ekran uyarısı gönder (troll)">
                  <Siren size={14} />
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

      {trollTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 glass rounded-3xl p-6 animate-pop-in border border-red-500/20 shadow-2xl shadow-red-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center animate-pulse"><Siren size={20} className="text-red-400" /></div>
                <div>
                  <h3 className="font-bold text-white">Ekran Uyarısı Gönder</h3>
                  <p className="text-xs text-surface-500"><strong className="text-red-400">{trollTarget.username}</strong>'ın ekranı tam ekran sirene döner 🔥</p>
                </div>
              </div>
              <button onClick={() => setTrollTarget(null)} className="text-surface-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="mb-3">
              <p className="text-[11px] text-surface-500 mb-1.5 font-medium">Hazır uyarılar</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TROLL_TEMPLATES.map((t) => (
                  <button key={t.text} onClick={() => setTrollText(t.text)}
                    className={`text-left text-[11px] px-2.5 py-2 rounded-lg border transition-all ${trollText === t.text ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-surface-800/60 border-surface-700 text-surface-300 hover:border-surface-500'}`}>
                    {t.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-[11px] text-surface-500 mb-1.5 font-medium">Ton</p>
              <div className="flex gap-1.5 flex-wrap">
                {(['scary', 'cute', 'warning', 'party'] as const).map((tone) => (
                  <button key={tone} onClick={() => setTrollTone(tone)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${trollTone === tone ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-surface-800/60 border-surface-700 text-surface-400 hover:text-white'}`}>
                    {tone === 'scary' ? '👻 Korkunç' : tone === 'cute' ? '🧸 Sevimli' : tone === 'warning' ? '⚠️ Uyarı' : '🎉 Parti'}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={trollText}
              onChange={(e) => setTrollText(e.target.value)}
              placeholder="Kendi mesajını yaz (opsiyonel)"
              rows={2}
              maxLength={160}
              className="w-full bg-surface-800/80 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-red-400/50 resize-none mb-4"
            />

            <button
              onClick={handleSendTroll}
              disabled={sendingTroll}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50"
            >
              {sendingTroll ? <Clock size={15} className="animate-spin" /> : <Send size={15} />}
              Şimdi Gönder 🚨
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
