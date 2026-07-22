import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { UserPlus, UserCheck, Clock, X, Users, Search } from 'lucide-react'

interface FriendUser { id: string; username: string; email?: string }
interface FriendRow { id: string; user_id: string; friend_id: string; status: string; created_at: string }

export default function FriendsPage() {
  const { user } = useStore()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRow[]>([])
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<FriendUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user) fetchFriends() }, [user])

  async function fetchFriends() {
    try {
      const { data: sent } = await supabase.from('friends').select('*, friend:friend_id(id, username)').eq('user_id', user?.id).eq('status', 'accepted')
      const { data: received } = await supabase.from('friends').select('*, user:user_id(id, username)').eq('friend_id', user?.id).eq('status', 'accepted')
      const { data: pending } = await supabase.from('friends').select('*').eq('friend_id', user?.id).eq('status', 'pending')
      const allFriends: FriendUser[] = []
      sent?.forEach((f: any) => f.friend && allFriends.push(f.friend))
      received?.forEach((f: any) => f.user && allFriends.push(f.user))
      setFriends(allFriends)
      setPendingRequests((pending || []) as FriendRow[])
    } catch (err: any) { setError(err.message) }
  }

  async function searchUser() {
    if (!searchEmail.trim()) return
    setSearching(true); setError(''); setSearchResult(null)
    try {
      const { data } = await supabase.from('users').select('id, username, email').eq('email', searchEmail).maybeSingle()
      if (!data) { setError('Bu e-posta ile kayıtlı kullanıcı bulunamadı'); return }
      if (data.id === user?.id) { setError('Bu senin e-postan!'); return }
      setSearchResult(data)
    } catch (err: any) { setError(err.message) } finally { setSearching(false) }
  }

  async function sendRequest(friendId: string) {
    if (!user) return
    const { error: e } = await supabase.from('friends').insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
    if (e) { setError(e.code === '23505' ? 'Zaten istek gönderilmiş' : e.message); return }
    setSearchResult(null); setSearchEmail('')
  }

  async function acceptRequest(friendUserId: string) {
    if (!user) return
    await supabase.from('friends').update({ status: 'accepted' }).eq('user_id', friendUserId).eq('friend_id', user.id)
    fetchFriends()
  }

  async function rejectRequest(friendUserId: string) {
    if (!user) return
    await supabase.from('friends').delete().eq('user_id', friendUserId).eq('friend_id', user.id)
    fetchFriends()
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Arkadaşlar</h1>
      <div className="max-w-xl space-y-6">
        <div className="flex gap-2">
          <Input placeholder="E-posta ile arkadaş ara..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUser()} />
          <Button variant="primary" onClick={searchUser} disabled={searching}><UserPlus size={16} /></Button>
        </div>
        {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-xl p-3 border border-red-500/10">{error}</p>}
        {searchResult && (
          <div className="glass rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center text-sm font-bold text-white">{searchResult.username[0]?.toUpperCase() || '?'}</div>
              <div><p className="text-sm font-medium">{searchResult.username}</p><p className="text-xs text-surface-400">{searchResult.email}</p></div>
            </div>
            <Button size="sm" onClick={() => sendRequest(searchResult.id)}>Arkadaş Ekle</Button>
          </div>
        )}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} /> Bekleyen İstekler</h2>
            <div className="flex flex-col gap-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-surface-900/50 border border-surface-800 rounded-xl p-3 flex items-center justify-between">
                  <p className="text-sm text-surface-300">Bir kullanıcıdan arkadaşlık isteği</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => acceptRequest(req.user_id)}><UserCheck size={14} /> Kabul</Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectRequest(req.user_id)}><X size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Arkadaşların ({friends.length})</h2>
          <div className="flex flex-col gap-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-surface-500"><Users size={36} className="mb-3 opacity-30" /><p className="text-sm">Henüz arkadaşın yok</p><p className="text-xs mt-1 text-surface-600">E-posta ile arkadaşlarını davet et</p></div>
            ) : friends.map((f) => (
              <div key={f.id} className="glass rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface-800/60 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500/30 to-wave-400/30 flex items-center justify-center text-sm font-bold text-wave-400">{f.username?.[0]?.toUpperCase() || '?'}</div>
                <div><p className="text-sm font-medium text-white">{f.username}</p>{f.email && <p className="text-xs text-surface-500">{f.email}</p>}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
