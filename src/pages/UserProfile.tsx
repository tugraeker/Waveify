import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import SongEditModal from '@/components/SongEditModal'
import type { Song, Badge } from '@/types'
import { Play, Music2, LogOut, Upload, Edit3, Save, X, Camera, Pencil, Trash2, Heart, Award } from 'lucide-react'

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser, setCurrentSong, setQueue, setUser } = useStore()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userSongs, setUserSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ songs: 0, likes: 0 })
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarInputKey, setAvatarInputKey] = useState(0)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set())
  const [badges, setBadges] = useState<Badge[]>([])

  const isOwn = !id || id === currentUser?.id
  const userId = isOwn ? currentUser?.id : id

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchProfile(userId)
  }, [userId])

  async function fetchProfile(uid: string) {
    setLoading(true)
    try {
      const { data: u } = await supabase.from('users').select('*').eq('id', uid).maybeSingle()
      if (u) {
        setUsername(u.username)
        setAvatarUrl(u.avatar_url || '')
        setBio(u.bio || '')
      } else if (isOwn && currentUser) {
        setUsername(currentUser.username)
        setAvatarUrl(currentUser.avatar_url || '')
        try { await supabase.from('users').insert({ id: currentUser.id, username: currentUser.username, email: currentUser.email }) } catch {}
      } else setUsername('Kullanıcı')

      const { data: owned } = await supabase.from('songs').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      const { data: collab } = await supabase.from('song_artists').select('song:song_id(*)').eq('user_id', uid)
      let allSongs: any[] = owned || []
      if (collab) {
        const collabSongs = collab.map((c: any) => c.song).filter(Boolean)
        const existingIds = new Set(allSongs.map(s => s.id))
        collabSongs.forEach((s: any) => { if (!existingIds.has(s.id)) { allSongs.push(s); existingIds.add(s.id) } })
      }
      setUserSongs(allSongs)
      setStats({ songs: allSongs.length, likes: 0 })

      if (currentUser) {
        const { data: likes } = await supabase.from('likes').select('song_id').eq('user_id', currentUser.id)
        if (likes) setLikedSongIds(new Set(likes.map((l: any) => l.song_id)))
      }

      const { data: b } = await supabase.from('badges').select('*').eq('user_id', uid)
      if (b) setBadges(b)
    } catch {} finally { setLoading(false) }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${currentUser.id}.${ext}`
      let publicUrl = ''

      // Try multiple bucket/path combos
      const attempts = [
        { bucket: 'covers', path: `avatars/${fileName}` },
        { bucket: 'avatars', path: fileName },
        { bucket: 'covers', path: fileName },
      ]

      for (const { bucket, path } of attempts) {
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl: url } } = supabase.storage.from(bucket).getPublicUrl(path)
          publicUrl = url
          break
        }
      }

      if (!publicUrl) throw new Error('Tüm yükleme denemeleri başarısız')
      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
      if (!updateError) {
        setAvatarUrl(publicUrl)
        setUser({ ...currentUser, avatar_url: publicUrl })
        setAvatarInputKey(prev => prev + 1)
      }
    } catch (e) { console.error('Avatar upload error:', e) } finally { setUploadingAvatar(false) }
  }

  async function removeAvatar() {
    if (!currentUser) return
    const { error } = await supabase.from('users').update({ avatar_url: '' }).eq('id', currentUser.id)
    if (!error) {
      setAvatarUrl('')
      setUser({ ...currentUser, avatar_url: '' })
      setAvatarInputKey(prev => prev + 1)
    }
  }

  async function saveProfile() {
    if (!currentUser || !editUsername.trim()) return
    setSaving(true)
    const { error } = await supabase.from('users').update({
      username: editUsername.trim(),
      bio: editBio.trim() || null,
    }).eq('id', currentUser.id)
    if (!error) {
      setUsername(editUsername.trim())
      setBio(editBio.trim())
      setEditing(false)
      setUser({ ...currentUser, username: editUsername.trim() })
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/auth')
  }

  function playSong(song: Song) { setQueue(userSongs); setCurrentSong(song) }

  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><p>Yükleniyor...</p></div>

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="bg-gradient-to-b from-surface-900 to-surface-950 p-8">
        <div className="flex items-end gap-6">
          <div className="relative w-48 h-48 flex-shrink-0 group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-48 h-48 rounded-full object-cover shadow-2xl" />
            ) : (
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-6xl font-bold text-white shadow-2xl">
                {username ? username[0].toUpperCase() : '?'}
              </div>
            )}
            {isOwn && (
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="flex items-center justify-center cursor-pointer p-2 rounded-full hover:bg-white/10">
                  {uploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={24} className="text-white" />
                  )}
                  <input key={avatarInputKey} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </label>
                {avatarUrl && (
                  <button onClick={removeAvatar} className="p-2 rounded-full hover:bg-white/10 text-white" title="Fotoğrafı Kaldır">
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase font-semibold tracking-widest text-surface-500">Profil</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-2">
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="max-w-xs" autoFocus />
                <button onClick={saveProfile} disabled={saving} className="text-wave-400 hover:text-wave-300 transition-colors"><Save size={18} /></button>
                <button onClick={() => setEditing(false)} className="text-surface-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <h1 className="text-4xl font-extrabold truncate">{username}</h1>
                {isOwn && (
                  <button onClick={() => { setEditUsername(username); setEditBio(bio); setEditing(true) }} className="text-surface-500 hover:text-wave-400 transition-colors">
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
            )}
            {bio && !editing && <p className="text-sm text-surface-400 mt-2 max-w-lg">{bio}</p>}
            {editing && (
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Hakkımda..."
                rows={2}
                className="mt-3 w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 resize-none"
              />
            )}
            <div className="flex items-center gap-6 mt-3 text-sm text-surface-400">
              <span>{stats.songs} şarkı</span>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {badges.map((b) => {
                  const isVerified = b.badge_type === 'verified' || b.badge_type === 'artist'
                  if (isVerified) {
                    return (
                      <div key={b.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-blue-400" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {b.label || 'Doğrulanmış Sanatçı'}
                      </div>
                    )
                  }
                  const bg = b.color || '#14b8a6'
                  return (
                    <div key={b.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm" style={{ backgroundColor: bg + '18', borderColor: bg + '30', borderWidth: 1, color: bg }}>
                      <Award size={12} />
                      {b.label || b.badge_type}
                    </div>
                  )
                })}
              </div>
            )}
            {isOwn && (
              <div className="flex gap-3 mt-5">
                <Button size="sm" onClick={() => navigate('/upload')}><Upload size={14} /> Şarkı Yükle</Button>
                <Button size="sm" variant="danger" onClick={handleLogout}><LogOut size={14} /> Çıkış Yap</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-lg font-semibold mb-4 text-surface-200">{isOwn ? 'Şarkıların' : `${username}'in Şarkıları`}</h2>
        {userSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-surface-500">
            <Music2 size={40} className="mb-3 opacity-50" />
            <p className="text-sm">Henüz şarkı yok</p>
            {isOwn && <button onClick={() => navigate('/upload')} className="text-wave-400 hover:underline text-sm mt-2">İlk şarkını yükle</button>}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {userSongs.map((song) => (
              <div key={song.id} className="group flex items-center gap-3.5 p-2.5 rounded-xl card-hover">
                <div className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song)}>
                  <button className="opacity-0 group-hover:opacity-100 text-wave-400"><Play size={14} fill="currentColor" /></button>
                  {song.cover_url ? <img src={song.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0"><Music2 size={16} className="text-surface-500" /></div>}
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-white">{song.title}</p><p className="text-xs text-surface-400 truncate">{song.artist}</p></div>
                  <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
                </div>
                {isOwn && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={async (e) => {
                      e.stopPropagation()
                      const isLiked = likedSongIds.has(song.id)
                      if (isLiked) {
                        await supabase.from('likes').delete().eq('user_id', currentUser!.id).eq('song_id', song.id)
                        likedSongIds.delete(song.id)
                      } else {
                        await supabase.from('likes').insert({ user_id: currentUser!.id, song_id: song.id })
                        likedSongIds.add(song.id)
                      }
                      setLikedSongIds(new Set(likedSongIds))
                    }} className={`p-1 rounded-lg transition-colors ${likedSongIds.has(song.id) ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
                      <Heart size={13} fill={likedSongIds.has(song.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditSong(song) }} className="text-surface-500 hover:text-wave-400 transition-colors p-1">
                      <Pencil size={14} />
                    </button>
                    <button onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm('Bu şarkıyı silmek istediğine emin misin?')) return
                      await supabase.from('songs').delete().eq('id', song.id)
                      setUserSongs((prev) => prev.filter((s) => s.id !== song.id))
                      setStats((prev) => ({ songs: prev.songs - 1, likes: prev.likes }))
                    }} className="text-surface-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editSong && (
        <SongEditModal
          song={editSong}
          open={!!editSong}
          onClose={() => setEditSong(null)}
          onSaved={(updated) => {
            setUserSongs((prev) => prev.map((s) => s.id === updated.id ? updated : s))
            setEditSong(null)
          }}
          onDeleted={() => {
            setUserSongs((prev) => prev.filter((s) => s.id !== editSong.id))
            setStats((prev) => ({ songs: prev.songs - 1, likes: prev.likes }))
            setEditSong(null)
          }}
        />
      )}
    </div>
  )
}
