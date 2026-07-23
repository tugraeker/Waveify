import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { BADGE_DEFS } from '@/types'
import type { User, Song, Badge } from '@/types'
import { emitToast } from '@/hooks/useToast'
import { Shield, Search, Trash2, Plus, X, Crown, Music, Users, Activity, Clock, TrendingUp, Disc, UserX } from 'lucide-react'

type Tab = 'users' | 'songs' | 'badges' | 'stats'

export default function AdminPage() {
  const { user: me } = useStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<(User & { song_count?: number })[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, songs: 0, plays: 0 })

  useEffect(() => {
    if (!me) return
    supabase.rpc('admin_check').then(({ data, error }) => {
      if (!error && data === true) setIsAdmin(true)
      else setIsAdmin(false)
      setLoading(false)
    })
  }, [me?.id])

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
    loadSongs()
    loadStats()
  }, [isAdmin])

  async function loadStats() {
    const { data, error } = await supabase.rpc('admin_get_stats')
    if (!error && data) {
      const s = data as any
      setStats({ users: s.users || 0, songs: s.songs || 0, plays: s.plays || 0 })
    } else {
      setStats({ users: 0, songs: 0, plays: 0 })
    }
  }

  async function loadUsers() {
    const [usersRes, statsRes] = await Promise.all([
      supabase.rpc('admin_get_users'),
      supabase.rpc('admin_get_user_stats'),
    ])
    if (usersRes.data) {
      const statsMap: Record<string, { song_count: number; play_count: number }> = {}
      if (statsRes.data) {
        for (const row of statsRes.data as any[]) {
          statsMap[row.user_id] = { song_count: Number(row.song_count) || 0, play_count: Number(row.play_count) || 0 }
        }
      }
      setUsers((usersRes.data as any[]).map((u: any) => ({
        ...u,
        song_count: statsMap[u.id]?.song_count || 0,
        play_count: statsMap[u.id]?.play_count || 0,
      })))
    }
    setLoading(false)
  }

  async function loadSongs() {
    const { data } = await supabase.rpc('admin_get_songs')
    if (data) setSongs(data as any)
    else {
      const { data: fallback } = await supabase.from('songs').select('*, user:user_id(id, username)').order('created_at', { ascending: false }).limit(100)
      if (fallback) setSongs(fallback as any)
    }
  }

  async function toggleAdmin(targetUser: User) {
    const { error } = await supabase.rpc('admin_toggle_admin', { target_user_id: targetUser.id })
    if (error) { emitToast('Hata: ' + error.message, 'error'); return }
    setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, is_admin: !targetUser.is_admin } : u))
    emitToast(`${targetUser.username} ${targetUser.is_admin ? 'admin yetkisi alındı' : 'admin yapıldı'}`, 'success')
  }

  async function deleteSong(song: Song) {
    if (!confirm(`"${song.title}" silinsin mi?`)) return
    const { error } = await supabase.rpc('admin_delete_song', { song_id: song.id })
    if (error) { emitToast('Hata: ' + error.message, 'error'); return }
    setSongs((prev) => prev.filter((s) => s.id !== song.id))
    emitToast('Şarkı silindi', 'success')
  }

  async function grantBadge(targetUser: User, badgeType: string) {
    const def = BADGE_DEFS.find((b) => b.type === badgeType)
    const { error } = await supabase.from('badges').insert({
      user_id: targetUser.id,
      badge_type: badgeType,
      label: def?.label || badgeType,
      color: def?.color || 'wave',
      granted_by: me?.id,
    })
    if (error) { emitToast(error.message, 'error'); return }
    emitToast(`${targetUser.username}'a ${def?.label} badge'i verildi`, 'success')
  }

  async function revokeBadge(badge: Badge) {
    const { error } = await supabase.from('badges').delete().eq('id', badge.id)
    if (error) { emitToast(error.message, 'error'); return }
    emitToast('Badge kaldırıldı', 'success')
  }

  async function deleteUser(targetUser: User) {
    if (!confirm(`"${targetUser.username}" kullanıcısını ve tüm şarkılarını silmek istediğine emin misin?`)) return
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: targetUser.id })
    if (error) { emitToast('Silme hatası: ' + error.message, 'error'); return }
    emitToast('Kullanıcı silindi', 'success')
    loadUsers()
    loadStats()
  }

  async function getUserBadges(userId: string): Promise<Badge[]> {
    const { data } = await supabase.from('badges').select('*').eq('user_id', userId)
    return data || []
  }

  if (!me) return null
  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><div className="w-6 h-6 border-2 border-wave-400 border-t-transparent rounded-full animate-spin" /></div>
  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-surface-500">
        <Shield size={64} className="mb-4 opacity-30" />
        <p className="text-lg">Yetkisiz erişim</p>
        <p className="text-sm text-surface-600 mt-1">Admin paneli yalnızca yöneticilere açıktır</p>
      </div>
    )
  }

  const filteredUsers = users.filter((u) => !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  const filteredSongs = songs.filter((s) => !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-wave-500/10 flex items-center justify-center">
            <Shield size={20} className="text-wave-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Paneli</h1>
            <p className="text-sm text-surface-400">{me.username} — Yönetici</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{ icon: Users, label: 'Kullanıcı', count: stats.users }, { icon: Music, label: 'Şarkı', count: stats.songs }, { icon: Activity, label: 'Dinlenme', count: stats.plays }].map(({ icon: Icon, label, count }) => (
            <div key={label} className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-wave-500/10 flex items-center justify-center">
                <Icon size={18} className="text-wave-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                <p className="text-xs text-surface-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {(['users', 'badges', 'songs', 'stats'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSearch('') }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
              {t === 'users' ? 'Kullanıcılar' : t === 'badges' ? 'Rozetler' : t === 'songs' ? 'Şarkılar' : 'İstatistik'}
            </button>
          ))}
        </div>

        {tab !== 'badges' && (
          <div className="relative mb-4 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                    <th className="text-left p-4 font-medium">Kullanıcı</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-center p-4 font-medium">Admin</th>
                    <th className="text-center p-4 font-medium">Şarkı</th>
                    <th className="text-center p-4 font-medium">Badge</th>
                    <th className="text-right p-4 font-medium">Kayıt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <UserRow key={u.id} user={u} onToggleAdmin={() => toggleAdmin(u)} onGrantBadge={(type) => grantBadge(u, type)} onRevokeBadge={(b) => revokeBadge(b)} onDelete={() => deleteUser(u)} />
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && <p className="text-center text-surface-500 py-8">Kullanıcı bulunamadı</p>}
          </div>
        )}

        {tab === 'badges' && (
          <div>
            <p className="text-sm text-surface-400 mb-4">Kullanıcı profiline tıklayarak badge yönetimi yapabilirsin.</p>
            <div className="flex flex-wrap gap-3">
              {BADGE_DEFS.map((b) => (
                <div key={b.type} className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <div>
                    <p className="text-sm font-medium">{b.label}</p>
                    <p className="text-xs text-surface-500">{b.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'songs' && (
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                    <th className="text-left p-4 font-medium">Şarkı</th>
                    <th className="text-left p-4 font-medium">Sanatçı</th>
                    <th className="text-left p-4 font-medium">Ekleyen</th>
                    <th className="text-center p-4 font-medium">Süre</th>
                    <th className="text-right p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map((s) => (
                    <tr key={s.id} className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {s.cover_url ? <img src={s.cover_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center"><Music size={14} className="text-surface-500" /></div>}
                          <span className="text-white truncate max-w-[200px]">{s.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-surface-400">{s.artist}</td>
                      <td className="p-4 text-surface-400">{(s as any).user?.username || '?'}</td>
                      <td className="p-4 text-center text-surface-500">{Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => deleteSong(s)} className="p-2 hover:bg-red-500/10 rounded-lg text-surface-500 hover:text-red-400 transition-colors" title="Sil">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredSongs.length === 0 && <p className="text-center text-surface-500 py-8">Şarkı bulunamadı</p>}
          </div>
        )}

        {tab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2"><Activity size={14} /> Genel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Toplam Kullanıcı', value: stats.users, icon: Users },
                  { label: 'Toplam Şarkı', value: stats.songs, icon: Music },
                  { label: 'Toplam Dinlenme', value: stats.plays, icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-surface-500" />
                      <span className="text-sm text-surface-300">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2"><TrendingUp size={14} /> En Aktif Kullanıcılar</h3>
              {users.length === 0 ? (
                <p className="text-sm text-surface-500">Veri yükleniyor...</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {users.sort((a, b) => ((b as any).song_count || 0) - ((a as any).song_count || 0)).slice(0, 5).map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40">
                      <span className="text-xs text-surface-600 w-5 text-center font-mono">{i + 1}</span>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {u.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-white flex-1 truncate">{u.username}</span>
                      <span className="text-xs text-surface-400 font-mono">{(u as any).song_count || 0} şarkı</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2"><Clock size={14} /> Son Yüklenenler</h3>
              <div className="flex flex-col gap-2">
                {songs.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40">
                    <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <Disc size={14} className="text-surface-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.title}</p>
                      <p className="text-xs text-surface-500 truncate">{(s as any).user?.username || '?'} · {s.artist}</p>
                    </div>
                    <span className="text-[10px] text-surface-600">{new Date(s.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ user, onToggleAdmin, onGrantBadge, onRevokeBadge, onDelete }: { user: User; onToggleAdmin: () => void; onGrantBadge: (type: string) => void; onRevokeBadge: (b: Badge) => void; onDelete: () => void }) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [showBadgePicker, setShowBadgePicker] = useState(false)

  useEffect(() => {
    supabase.from('badges').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) setBadges(data)
    })
  }, [user.id])

  return (
    <tr className="border-b border-surface-800/30 hover:bg-surface-800/20 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
            {user.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-medium">{user.username}</span>
              {user.is_admin && <Crown size={12} className="text-amber-400" />}
            </div>
            <div className="flex gap-1 mt-0.5">
              {badges.map((b) => (
                <span key={b.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 group/badge" style={{ backgroundColor: b.color + '20', color: b.color }}>
                  {b.label || b.badge_type}
                  <button onClick={() => onRevokeBadge(b)} className="opacity-0 group-hover/badge:opacity-100 hover:text-red-400 transition-opacity" title="Kaldır">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 text-surface-400 text-xs">{user.email || '-'}</td>
      <td className="p-4 text-center text-xs text-surface-500">{(user as any).song_count || 0}</td>
      <td className="p-4 text-center">
        <button onClick={onToggleAdmin} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${user.is_admin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-surface-800 text-surface-400 border border-transparent hover:border-surface-600'}`}>
          {user.is_admin ? 'Admin' : 'Yap'}
        </button>
      </td>
      <td className="p-4 text-center relative">
        <button onClick={() => setShowBadgePicker(!showBadgePicker)} className="text-xs px-2.5 py-1 rounded-lg bg-wave-500/10 text-wave-400 border border-wave-500/20 font-medium hover:bg-wave-500/20 transition-all">
          <Plus size={12} className="inline mr-1" />Badge
        </button>
        {showBadgePicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl p-2 z-50 w-48 animate-fade-in" onMouseLeave={() => setShowBadgePicker(false)}>
            {BADGE_DEFS.filter((bd) => !badges.some((b) => b.badge_type === bd.type)).map((bd) => (
              <button key={bd.type} onClick={() => { onGrantBadge(bd.type); setShowBadgePicker(false) }} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-surface-800/60 text-sm transition-colors">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bd.color }} />
                {bd.label}
              </button>
            ))}
            {BADGE_DEFS.every((bd) => badges.some((b) => b.badge_type === bd.type)) && <p className="text-xs text-surface-500 p-2 text-center">Tüm badge'ler verilmiş</p>}
            {badges.length > 0 && <div className="border-t border-surface-800 mt-1 pt-1"><p className="text-[10px] text-surface-500 px-2 py-1">Mevcut badge'ler:</p>{badges.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-2 py-1">
                <span className="text-xs" style={{ color: b.color }}>{b.label || b.badge_type}</span>
                <button onClick={() => onRevokeBadge(b)} className="text-surface-500 hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            ))}</div>}
          </div>
        )}
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Kullanıcıyı Sil">
            <Trash2 size={13} />
          </button>
          <span className="text-surface-500 text-xs">{new Date(user.created_at).toLocaleDateString('tr-TR')}</span>
        </div>
      </td>
    </tr>
  )
}
