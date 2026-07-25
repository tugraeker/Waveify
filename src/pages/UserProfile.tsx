import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import SongEditModal from '@/components/SongEditModal'
import type { Song, Badge, AccentColor } from '@/types'
import { computeLevel } from '@/types'
import { getXpTotal, getStats } from '@/lib/achievements'
import {
  Play, Music2, LogOut, Upload, Edit3, Save, X, Camera,
  Pencil, Trash2, Heart, Award, Palette, Grid3X3, List,
  Image as ImageIcon, ChevronDown, Disc3,
} from 'lucide-react'

const ACCENT_COLORS: { key: AccentColor; label: string; color: string }[] = [
  { key: 'wave', label: 'Wave', color: '#22c7c0' },
  { key: 'purple', label: 'Mor', color: '#8b5cf6' },
  { key: 'green', label: 'Yeşil', color: '#10b981' },
  { key: 'blue', label: 'Mavi', color: '#3b82f6' },
  { key: 'warm', label: 'Sıcak', color: '#f97316' },
  { key: 'pink', label: 'Pembe', color: '#ec4899' },
  { key: 'classic', label: 'Klasik', color: '#f59e0b' },
]

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
  const [bannerUrl, setBannerUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [avatarInputKey, setAvatarInputKey] = useState(0)
  const [bannerInputKey, setBannerInputKey] = useState(0)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set())
  const [badges, setBadges] = useState<Badge[]>([])
  const [accentColor, setAccentColor] = useState<AccentColor>('wave')
  const [showColors, setShowColors] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [density, setDensity] = useState<'compact' | 'normal'>('normal')
  const [showStats, setShowStats] = useState(true)
  const [profileBg, setProfileBg] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [sortedSongs, setSortedSongs] = useState<Song[]>([])

  const isOwn = !id || id === currentUser?.id
  const userId = isOwn ? currentUser?.id : id

  // Sort songs: albums/EPs first, then singles
  useEffect(() => {
    const sorted = [...userSongs].sort((a, b) => {
      if (a.album && !b.album) return -1
      if (!a.album && b.album) return 1
      return 0
    })
    setSortedSongs(sorted)
  }, [userSongs])

  // Group songs by album
  const albumGroups: { name: string; songs: Song[] }[] = []
  const singles: Song[] = []
  const seenAlbums = new Map<string, Song[]>()
  for (const s of userSongs) {
    if (s.album) {
      const arr = seenAlbums.get(s.album) || []
      arr.push(s)
      seenAlbums.set(s.album, arr)
    } else {
      singles.push(s)
    }
  }
  seenAlbums.forEach((songs, name) => albumGroups.push({ name, songs }))

  // Load saved display settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('waveify_accent')
      if (saved) setAccentColor(saved as AccentColor)
      const savedView = localStorage.getItem('waveify_profile_view')
      if (savedView) setViewMode(savedView as 'list' | 'grid')
      const savedDensity = localStorage.getItem('waveify_profile_density')
      if (savedDensity) setDensity(savedDensity as 'compact' | 'normal')
      const savedShowStats = localStorage.getItem('waveify_profile_show_stats')
      if (savedShowStats !== null) setShowStats(savedShowStats === 'true')
      const savedBg = localStorage.getItem('waveify_profile_bg')
      if (savedBg) setProfileBg(savedBg)
    } catch {}
  }, [])

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
        setBannerUrl(u.banner_url || '')
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

  async function uploadImage(
    file: File,
    prefix: string,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
    inputKeySetter: Dispatch<SetStateAction<number>>,
    field: string,
  ) {
    if (!file || !currentUser) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${prefix}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('covers')
        .upload(fileName, file, { upsert: true })
      if (upErr) throw new Error(upErr.message)
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName)
      await supabase.from('users').update({ [field]: publicUrl }).eq('id', currentUser.id)
      setUrl(publicUrl)
      setUser({ ...currentUser, [field]: publicUrl })
      inputKeySetter(prev => prev + 1)
    } catch (e: any) {
      if (e.message?.includes('policy') || e.message?.includes('security') || e.message?.includes('RLS'))
        alert('Supabase Storage RLS engelliyor. migration_v13_storage_rls.sql dosyasını Supabase SQL Editor\'da çalıştır.')
      else console.error('Upload error:', e)
    } finally { setUploading(false) }
  }

  async function removeImage(field: string, setUrl: (url: string) => void, setUserField: string) {
    if (!currentUser) return
    const { error } = await supabase.from('users').update({ [field]: '' }).eq('id', currentUser.id)
    if (!error) {
      setUrl('')
      setUser({ ...currentUser, [setUserField]: '' })
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

  function setAccentAndSave(c: AccentColor) {
    setAccentColor(c)
    setShowColors(false)
    try { localStorage.setItem('waveify_accent', c) } catch {}
    document.documentElement.setAttribute('data-accent', c)
  }

  function toggleView() {
    const next = viewMode === 'list' ? 'grid' : 'list'
    setViewMode(next)
    try { localStorage.setItem('waveify_profile_view', next) } catch {}
  }

  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><p>Yükleniyor...</p></div>

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in" style={profileBg ? { backgroundColor: profileBg } : {}}>
      {/* Banner */}
      <div className="relative h-56 md:h-72 flex-shrink-0 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-wave-500/5 via-surface-800 to-surface-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-transparent" />
        {isOwn && (
          <div className="absolute top-3 right-3 flex gap-2">
            <label className="cursor-pointer p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm">
              {uploadingBanner ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={16} className="text-white" />
              )}
              <input key={bannerInputKey} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadImage(f, 'banner', setBannerUrl, setUploadingBanner, setBannerInputKey, 'banner_url')
              }} />
            </label>
            {bannerUrl && (
              <button onClick={() => removeImage('banner_url', setBannerUrl, 'banner_url')} className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm">
                <X size={16} className="text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="px-8 pb-4 -mt-24 relative z-10">
        <div className="flex items-end gap-6">
          <div className="relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover shadow-2xl ring-4 ring-surface-950" />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-surface-950">
                {username ? username[0].toUpperCase() : '?'}
              </div>
            )}
            {isOwn && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="cursor-pointer p-1.5 rounded-lg hover:bg-white/10">
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                  <input key={avatarInputKey} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadImage(f, 'avatar', setAvatarUrl, setUploadingAvatar, setAvatarInputKey, 'avatar_url')
                  }} />
                </label>
                {avatarUrl && (
                  <button onClick={() => removeImage('avatar_url', setAvatarUrl, 'avatar_url')} className="p-1.5 rounded-lg hover:bg-white/10">
                    <X size={16} className="text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-20">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold truncate text-white drop-shadow-lg">{username}</h1>
              {badges.some(b => b.badge_type === 'verified' || b.badge_type === 'artist') && (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-400 drop-shadow" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              )}
              {isOwn && (
                <button onClick={() => { setEditUsername(username); setEditBio(bio); setEditing(true) }} className="text-surface-400 hover:text-wave-400 transition-colors">
                  <Edit3 size={14} />
                </button>
              )}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {badges.slice(0, 8).map((b) => {
                  const bg = b.color || '#14b8a6'
                  return (
                    <div key={b.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm backdrop-blur-sm"
                      style={{ backgroundColor: bg + '25', borderColor: bg + '40', borderWidth: 1, color: bg }}>
                      <Award size={10} />
                      {b.label || b.badge_type}
                    </div>
                  )
                })}
                {badges.length > 8 && (
                  <span className="text-[10px] text-surface-500">+{badges.length - 8}</span>
                )}
              </div>
            )}

            {editing ? (
              <div className="mt-3 space-y-2">
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="max-w-xs" autoFocus />
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Hakkımda..." rows={2}
                  className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 resize-none" />
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-wave-500/10 text-wave-400 border border-wave-500/20 hover:bg-wave-500/20 transition-colors">
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface-800 text-surface-300 border border-surface-700 hover:text-white transition-colors">İptal</button>
                </div>
              </div>
            ) : (
              <>
                {bio && <p className="text-sm text-surface-400 mt-2 max-w-lg">{bio}</p>}
                {isOwn && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" onClick={() => navigate('/upload')}><Upload size={13} /> Yükle</Button>
                    <button onClick={() => setShowSettings(!showSettings)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showSettings ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
                      <Palette size={13} className="inline mr-1" />Özelleştir
                    </button>
                    <Button size="sm" variant="danger" onClick={handleLogout}><LogOut size={13} /> Çıkış</Button>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-5 mt-3 text-sm text-surface-400">
              <span><strong className="text-white">{stats.songs}</strong> şarkı</span>
              {(() => {
                const xp = getXpTotal()
                const lv = computeLevel(xp)
                return (
                  <span className="flex items-center gap-1.5">
                    <Award size={13} className="text-wave-400" />
                    <strong className="text-white">Seviye {lv.level}</strong>
                    <span className="text-[10px] text-surface-500">({lv.xp}/{lv.nextLevelXp} XP)</span>
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && isOwn && (
        <div className="mx-8 mb-6 p-5 rounded-2xl glass border border-surface-800/50 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-200">Profil Özelleştirme</h3>
            <button onClick={() => setShowSettings(false)} className="text-surface-500 hover:text-white"><X size={16} /></button>
          </div>

          {/* Accent color */}
          <div className="mb-4">
            <p className="text-xs text-surface-400 mb-2 font-medium">Vurgu Rengi</p>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setAccentAndSave(c.key)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    accentColor === c.key ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* View mode */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-surface-400">Görünüm</span>
            <div className="flex bg-surface-800 rounded-lg p-0.5">
              <button onClick={() => { setViewMode('list'); localStorage.setItem('waveify_profile_view', 'list') }}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${viewMode === 'list' ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white'}`}>
                <List size={14} className="inline mr-1" />Liste
              </button>
              <button onClick={() => { setViewMode('grid'); localStorage.setItem('waveify_profile_view', 'grid') }}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${viewMode === 'grid' ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white'}`}>
                <Grid3X3 size={14} className="inline mr-1" />Izgara
              </button>
            </div>
          </div>

          {/* Density */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-surface-400">Yoğunluk</span>
            <div className="flex bg-surface-800 rounded-lg p-0.5">
              <button onClick={() => { setDensity('compact'); localStorage.setItem('waveify_profile_density', 'compact') }}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${density === 'compact' ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white'}`}>
                Sıkı
              </button>
              <button onClick={() => { setDensity('normal'); localStorage.setItem('waveify_profile_density', 'normal') }}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${density === 'normal' ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white'}`}>
                Normal
              </button>
            </div>
          </div>

          {/* Show stats */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-surface-400">İstatistikler</span>
            <button
              onClick={() => {
                const next = !showStats
                setShowStats(next)
                localStorage.setItem('waveify_profile_show_stats', String(next))
              }}
              className={`relative w-10 h-5 rounded-full transition-colors ${showStats ? 'bg-wave-500' : 'bg-surface-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showStats ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Background color */}
          <div>
            <span className="text-xs text-surface-400 block mb-2">Arkaplan Rengi</span>
            <div className="flex gap-2">
              {['#121216', '#1a1a2e', '#16213e', '#1b2838', '#2d1b36', '#1b1b1b'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setProfileBg(c); localStorage.setItem('waveify_profile_bg', c) }}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${profileBg === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={profileBg || '#121216'}
                onChange={(e) => { setProfileBg(e.target.value); localStorage.setItem('waveify_profile_bg', e.target.value) }}
                className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Songs section */}
      <div className="px-8 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-200">{isOwn ? 'Şarkıların' : `Şarkılar`}</h2>
          <span className="text-xs text-surface-500">{stats.songs} parça</span>
        </div>

        {userSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-surface-500">
            <Music2 size={40} className="mb-3 opacity-50" />
            <p className="text-sm">Henüz şarkı yok</p>
            {isOwn && <button onClick={() => navigate('/upload')} className="text-wave-400 hover:underline text-sm mt-2">İlk şarkını yükle</button>}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sortedSongs.map((song) => (
              <div key={song.id} onClick={() => playSong(song)} className="group cursor-pointer">
                <div className="aspect-square rounded-xl overflow-hidden bg-surface-800 relative mb-2">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 size={32} className="text-surface-600" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-wave-500/90 flex items-center justify-center shadow-lg">
                      <Play size={20} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                  {song.album && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-surface-300 font-medium">
                      {song.album}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate text-white group-hover:text-wave-400 transition-colors">{song.title}</p>
                <p className="text-xs text-surface-400 truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Albums */}
            {albumGroups.map((group) => (
              <div key={group.name} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Disc3 size={14} className="text-wave-400" />
                  <span className="text-sm font-semibold text-surface-300">{group.name}</span>
                  <span className="text-[10px] text-surface-500">{group.songs.length} parça</span>
                </div>
                <div className="flex flex-col gap-0.5 ml-4 border-l border-surface-800 pl-3">
                  {group.songs.map((song) => (
                    <SongRow key={song.id} song={song} isOwn={isOwn} currentUser={currentUser}
                      likedSongIds={likedSongIds} setLikedSongIds={setLikedSongIds}
                      onPlay={() => playSong(song)} onEdit={() => setEditSong(song)}
                      onDelete={() => {
                        supabase.from('songs').delete().eq('id', song.id)
                        setUserSongs((prev) => prev.filter((s) => s.id !== song.id))
                        setStats((prev) => ({ ...prev, songs: prev.songs - 1 }))
                      }} />
                  ))}
                </div>
              </div>
            ))}
            {/* Singles */}
            {singles.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {albumGroups.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <Music2 size={14} className="text-surface-500" />
                    <span className="text-sm font-semibold text-surface-400">Single'lar</span>
                  </div>
                )}
                {singles.map((song) => (
                  <SongRow key={song.id} song={song} isOwn={isOwn} currentUser={currentUser}
                    likedSongIds={likedSongIds} setLikedSongIds={setLikedSongIds}
                    onPlay={() => playSong(song)} onEdit={() => setEditSong(song)}
                    onDelete={() => {
                      supabase.from('songs').delete().eq('id', song.id)
                      setUserSongs((prev) => prev.filter((s) => s.id !== song.id))
                      setStats((prev) => ({ ...prev, songs: prev.songs - 1 }))
                    }} />
                ))}
              </div>
            )}
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

function SongRow({ song, isOwn, currentUser, likedSongIds, setLikedSongIds, onPlay, onEdit, onDelete }: {
  song: Song; isOwn: boolean; currentUser: any; likedSongIds: Set<string>
  setLikedSongIds: (f: (prev: Set<string>) => Set<string>) => void
  onPlay: () => void; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <button className="opacity-0 group-hover:opacity-100 text-wave-400 flex-shrink-0"><Play size={13} fill="currentColor" /></button>
        {song.cover_url ? (
          <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
            <Music2 size={14} className="text-surface-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white">{song.title}</p>
          <p className="text-xs text-surface-400 truncate">{song.artist}</p>
        </div>
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
            setLikedSongIds((prev) => new Set(prev))
          }} className={`p-1 rounded-lg transition-colors ${likedSongIds.has(song.id) ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
            <Heart size={13} fill={likedSongIds.has(song.id) ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="text-surface-500 hover:text-wave-400 transition-colors p-1">
            <Pencil size={13} />
          </button>
          <button onClick={async (e) => {
            e.stopPropagation()
            if (!confirm('Bu şarkıyı silmek istediğine emin misin?')) return
            onDelete()
          }} className="text-surface-500 hover:text-red-400 transition-colors p-1">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
