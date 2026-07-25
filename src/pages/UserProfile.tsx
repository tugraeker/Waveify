import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react'
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
  Image as ImageIcon, ChevronDown, Disc3, Sun, Moon,
  Eye, EyeOff, Star, Clock, Music, Users, Calendar,
  Type, Layout, Sparkles, Film,
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

const PROFILE_THEMES = [
  { key: 'default', label: 'Varsayılan', bg: '', text: 'text-white' },
  { key: 'ocean', label: 'Okyanus', bg: '#0c4a6e', text: 'text-blue-100' },
  { key: 'sunset', label: 'Günbatımı', bg: '#431407', text: 'text-orange-100' },
  { key: 'forest', label: 'Orman', bg: '#052e16', text: 'text-green-100' },
  { key: 'midnight', label: 'Gece', bg: '#020617', text: 'text-slate-100' },
]

const AVATAR_FRAMES = [
  { key: 'none', label: 'Yok', class: '' },
  { key: 'ring', label: 'Halka', class: 'ring-4 ring-wave-400' },
  { key: 'glow', label: 'Parlak', class: 'shadow-lg shadow-wave-400/50 ring-2 ring-wave-400' },
  { key: 'neon', label: 'Neon', class: 'ring-4 ring-pink-400 shadow-lg shadow-pink-400/30' },
  { key: 'gold', label: 'Altın', class: 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/30' },
  { key: 'gradient', label: 'Gradyan', class: 'ring-4 ring-transparent bg-gradient-to-br from-wave-400 to-purple-500 p-0.5' },
]

const LAYOUTS = [
  { key: 'default', label: 'Varsayılan', cols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' },
  { key: 'compact', label: 'Kompakt', cols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5' },
  { key: 'cards', label: 'Kartlar', cols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
  { key: 'minimal', label: 'Minimal', cols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2' },
]

const FONTS = [
  { key: 'default', label: 'Varsayılan', family: 'inherit' },
  { key: 'serif', label: 'Serif', family: "'Georgia', serif" },
  { key: 'mono', label: 'Monospace', family: "'Courier New', monospace" },
  { key: 'rounded', label: 'Yuvarlak', family: "'Segoe UI', system-ui, sans-serif" },
  { key: 'elegant', label: 'Elegant', family: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
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
  const [stats, setStats] = useState({ songs: 0, likes: 0, totalPlays: 0 })
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
  const [profileTheme, setProfileTheme] = useState('default')
  const [profileFont, setProfileFont] = useState('default')
  const [avatarFrame, setAvatarFrame] = useState('none')
  const [layout, setLayout] = useState('default')
  const [showBadgeNames, setShowBadgeNames] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(false)
  const [favArtists, setFavArtists] = useState<string[]>([])
  const [lastSeen, setLastSeen] = useState('')
  const [parallaxOffset, setParallaxOffset] = useState(0)
  const bannerRef = useRef<HTMLDivElement>(null)
  const charCount = bio.length

  const isOwn = !id || id === currentUser?.id
  const userId = isOwn ? currentUser?.id : id

  useEffect(() => {
    const sorted = [...userSongs].sort((a, b) => {
      if (a.album && !b.album) return -1; if (!a.album && b.album) return 1; return 0
    })
    setSortedSongs(sorted)
  }, [userSongs])

  const albumGroups: { name: string; songs: Song[] }[] = []
  const singles: Song[] = []
  const seenAlbums = new Map<string, Song[]>()
  for (const s of userSongs) {
    if (s.album) { const arr = seenAlbums.get(s.album) || []; arr.push(s); seenAlbums.set(s.album, arr) }
    else singles.push(s)
  }
  seenAlbums.forEach((songs, name) => albumGroups.push({ name, songs }))

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
      const theme = localStorage.getItem('waveify_profile_theme')
      if (theme) setProfileTheme(theme)
      const font = localStorage.getItem('waveify_profile_font')
      if (font) setProfileFont(font)
      const frame = localStorage.getItem('waveify_avatar_frame')
      if (frame) setAvatarFrame(frame)
      const lay = localStorage.getItem('waveify_profile_layout')
      if (lay) setLayout(lay)
      const badgeNames = localStorage.getItem('waveify_show_badge_names')
      if (badgeNames !== null) setShowBadgeNames(badgeNames === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchProfile(userId)
  }, [userId])

  useEffect(() => {
    if (!isOwn) return
    setLastSeen(new Date().toLocaleString('tr-TR'))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (bannerRef.current) {
        const rect = bannerRef.current.getBoundingClientRect()
        setParallaxOffset(Math.min(0, rect.top * 0.15))
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function fetchProfile(uid: string) {
    setLoading(true)
    try {
      const { data: u } = await supabase.from('users').select('*').eq('id', uid).maybeSingle()
      if (u) {
        setUsername(u.username)
        setAvatarUrl(u.avatar_url || localStorage.getItem('waveify_avatar_url') || '')
        setBannerUrl(u.banner_url || localStorage.getItem('waveify_banner_url') || '')
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
      setStats(s => ({ ...s, songs: allSongs.length }))

      if (currentUser) {
        const { data: likes } = await supabase.from('likes').select('song_id').eq('user_id', currentUser.id)
        if (likes) setLikedSongIds(new Set(likes.map((l: any) => l.song_id)))
      }

      try { const { data: b } = await supabase.from('badges').select('*').eq('user_id', uid); if (b) setBadges(b) } catch {}

      // Favori sanatçılar
      const artistCount: Record<string, number> = {}
      const { data: history } = await supabase.from('listen_history').select('*, song:songs(artist)').eq('user_id', uid).limit(500)
      if (history) {
        history.forEach((h: any) => { if (h.song?.artist) artistCount[h.song.artist] = (artistCount[h.song.artist] || 0) + 1 })
        setFavArtists(Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name))
        setStats(s => ({ ...s, totalPlays: history.length }))
      }
    } catch {} finally { setLoading(false) }
  }

  async function uploadImage(file: File, prefix: string, setUrl: (url: string) => void, setUploading: (v: boolean) => void, inputKeySetter: Dispatch<SetStateAction<number>>, field: string) {
    if (!file || !currentUser) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${prefix}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(fileName, file, { upsert: true })
      if (upErr) {
        if (upErr.message?.includes('duplicate')) {
          const { error: rmErr } = await supabase.storage.from('covers').remove([fileName])
          if (!rmErr) {
            const { error: retryErr } = await supabase.storage.from('covers').upload(fileName, file)
            if (retryErr) throw new Error(retryErr.message)
          } else throw new Error(upErr.message)
        } else if (upErr.message?.includes('policy') || upErr.message?.includes('security') || upErr.message?.includes('RLS') || upErr.message?.includes('violates')) {
          throw new Error('Supabase Storage RLS izin vermiyor. Lütfen Supabase SQL Editor\'da şu SQL\'i çalıştır:\n\n' +
            'INSERT INTO storage.buckets (id,name,public) VALUES (\'covers\',\'covers\',true) ON CONFLICT DO NOTHING;\n' +
            'DROP POLICY IF EXISTS "Allow upload covers" ON storage.objects;\n' +
            'CREATE POLICY "Allow upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id=\'covers\');\n' +
            'DROP POLICY IF EXISTS "Allow read covers" ON storage.objects;\n' +
            'CREATE POLICY "Allow read covers" ON storage.objects FOR SELECT TO public USING (bucket_id=\'covers\');\n' +
            'DROP POLICY IF EXISTS "Allow delete covers" ON storage.objects;\n' +
            'CREATE POLICY "Allow delete covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id=\'covers\');')
        } else throw new Error(upErr.message)
      }
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName)
      localStorage.setItem(`waveify_${field}`, publicUrl)
      setUrl(publicUrl)
      setUser({ ...(currentUser as any), [field]: publicUrl })
      inputKeySetter(prev => prev + 1)
    } catch (e: any) {
      console.error('Upload error:', e)
      alert(e.message)
    } finally { setUploading(false) }
  }

  async function removeImage(field: string, setUrl: (url: string) => void, setUserField: string) {
    if (!currentUser) return
    localStorage.removeItem(`waveify_${field}`)
    setUrl('')
    setUser({ ...(currentUser as any), [setUserField]: '' })
  }

  useEffect(() => {
    const savedAvatar = localStorage.getItem('waveify_avatar_url')
    const savedBanner = localStorage.getItem('waveify_banner_url')
    if (savedAvatar) setAvatarUrl(savedAvatar)
    if (savedBanner) setBannerUrl(savedBanner)
  }, [])

  async function saveProfile() {
    if (!currentUser || !editUsername.trim()) return
    setSaving(true)
    const { error } = await supabase.from('users').update({ username: editUsername.trim(), bio: editBio.trim() || null }).eq('id', currentUser.id)
    if (!error) { setUsername(editUsername.trim()); setBio(editBio.trim()); setEditing(false); setUser({ ...currentUser, username: editUsername.trim() }) }
    setSaving(false)
  }

  async function handleLogout() { await supabase.auth.signOut(); setUser(null); navigate('/auth') }

  function playSong(song: Song) { setQueue(userSongs); setCurrentSong(song) }

  function setAccentAndSave(c: AccentColor) { setAccentColor(c); setShowColors(false); localStorage.setItem('waveify_accent', c); document.documentElement.setAttribute('data-accent', c) }

  const xp = getXpTotal()
  const lv = computeLevel(xp)
  const currentTheme = PROFILE_THEMES.find(t => t.key === profileTheme) || PROFILE_THEMES[0]

  if (loading) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><p>Yükleniyor...</p></div>
  if (privacyMode && !isOwn) return <div className="p-8 flex items-center justify-center h-full text-surface-500"><EyeOff size={48} className="mb-4 opacity-30" /><p>Bu profil gizli</p></div>

  return (
    <div className="overflow-y-auto h-full scrollbar-thin animate-fade-in" style={{ backgroundColor: profileBg || currentTheme.bg || undefined, fontFamily: FONTS.find(f => f.key === profileFont)?.family || undefined }}>
      {/* Banner with parallax */}
      <div ref={bannerRef} className="relative h-56 md:h-72 flex-shrink-0 overflow-hidden bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" style={{ transform: `translateY(${parallaxOffset}px)` }} />
        ) : profileTheme === 'ocean' ? (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-cyan-800 to-teal-900" />
        ) : profileTheme === 'sunset' ? (
          <div className="w-full h-full bg-gradient-to-br from-orange-900 via-rose-800 to-purple-900" />
        ) : profileTheme === 'forest' ? (
          <div className="w-full h-full bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900" />
        ) : profileTheme === 'midnight' ? (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-wave-500/5 via-surface-800 to-surface-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-transparent" />
        {isOwn && (
          <div className="absolute top-3 right-3 flex gap-2">
            <label className="cursor-pointer p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm">
              {uploadingBanner ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={16} className="text-white" />}
              <input key={bannerInputKey} type="file" accept="image/*,.gif,.mp4" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'banner', setBannerUrl, setUploadingBanner, setBannerInputKey, 'banner_url') }} />
            </label>
            {bannerUrl && <button onClick={() => removeImage('banner_url', setBannerUrl, 'banner_url')} className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm"><X size={16} className="text-white" /></button>}
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="px-8 pb-4 -mt-24 relative z-10">
        <div className="flex items-end gap-6">
          <div className={`relative w-32 h-32 md:w-36 md:h-36 flex-shrink-0 group ${AVATAR_FRAMES.find(f => f.key === avatarFrame)?.class || ''} rounded-2xl`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover shadow-2xl ring-4 ring-surface-950 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3" />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-surface-950 transition-transform duration-300 group-hover:scale-105">
                {username ? username[0].toUpperCase() : '?'}
              </div>
            )}
            {isOwn && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="cursor-pointer p-1.5 rounded-lg hover:bg-white/10">
                  {uploadingAvatar ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={18} className="text-white" />}
                  <input key={avatarInputKey} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'avatar', setAvatarUrl, setUploadingAvatar, setAvatarInputKey, 'avatar_url') }} />
                </label>
                {avatarUrl && <button onClick={() => removeImage('avatar_url', setAvatarUrl, 'avatar_url')} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} className="text-white" /></button>}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-20">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={`text-3xl font-extrabold truncate drop-shadow-lg ${currentTheme.text || 'text-white'}`}>{username}</h1>
              {badges.some(b => b.badge_type === 'verified' || b.badge_type === 'artist') && (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-400 drop-shadow" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
              )}
              {isOwn && <button onClick={() => { setEditUsername(username); setEditBio(bio); setEditing(true) }} className="text-surface-400 hover:text-wave-400 transition-colors"><Edit3 size={14} /></button>}
            </div>

            {/* Badge showcase */}
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {badges.slice(0, showBadgeNames ? 8 : 16).map((b) => {
                  const bg = b.color || '#14b8a6'
                  return (
                    <div key={b.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm backdrop-blur-sm" style={{ backgroundColor: bg + '25', borderColor: bg + '40', borderWidth: 1, color: bg }}>
                      <Award size={10} />
                      {showBadgeNames ? (b.label || b.badge_type) : ''}
                    </div>
                  )
                })}
                {badges.length > (showBadgeNames ? 8 : 16) && <span className="text-[10px] text-surface-500">+{badges.length - (showBadgeNames ? 8 : 16)}</span>}
              </div>
            )}

            {editing ? (
              <div className="mt-3 space-y-2">
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="max-w-xs" autoFocus />
                <div className="relative">
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Hakkımda..." rows={2} maxLength={500}
                    className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 resize-none" />
                  <span className="absolute bottom-2 right-3 text-[10px] text-surface-500">{editBio.length}/500</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-wave-500/10 text-wave-400 border border-wave-500/20 hover:bg-wave-500/20 transition-colors">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                  <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface-800 text-surface-300 border border-surface-700 hover:text-white transition-colors">İptal</button>
                </div>
              </div>
            ) : (
              <>
                {bio && <p className={`text-sm mt-2 max-w-lg ${currentTheme.text?.includes('100') ? 'opacity-80' : 'text-surface-400'}`}>{bio}</p>}
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

            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-surface-400">
              <span><strong className={currentTheme.text || 'text-white'}>{stats.songs}</strong> şarkı</span>
              <span className="flex items-center gap-1.5">
                <Award size={13} className="text-wave-400" />
                <strong className={currentTheme.text || 'text-white'}>Seviye {lv.level}</strong>
                <span className="text-[10px] text-surface-500">({lv.xp}/{lv.nextLevelXp} XP)</span>
              </span>
              {stats.totalPlays > 0 && <span><strong className={currentTheme.text || 'text-white'}>{stats.totalPlays}</strong> dinlenme</span>}
              {lastSeen && isOwn && <span className="text-[10px] text-surface-500 flex items-center gap-1"><Clock size={10} /> Son görülme: {lastSeen}</span>}
            </div>

            {/* Favori sanatçılar */}
            {favArtists.length > 0 && showStats && (
              <div className="flex items-center gap-1.5 mt-2">
                <Star size={11} className="text-amber-400" />
                <span className="text-[11px] text-surface-500">En çok dinlenen: </span>
                <span className="text-[11px] text-surface-300 font-medium">{favArtists.join(', ')}</span>
              </div>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tema */}
            <div>
              <p className="text-xs text-surface-400 mb-2 font-medium flex items-center gap-1"><Sun size={12} /> Tema</p>
              <div className="flex flex-wrap gap-1.5">
                {PROFILE_THEMES.map(t => (
                  <button key={t.key} onClick={() => { setProfileTheme(t.key); localStorage.setItem('waveify_profile_theme', t.key) }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${profileTheme === t.key ? 'bg-wave-500/20 text-wave-400 border border-wave-500/20' : 'bg-surface-800 text-surface-400 border border-transparent hover:border-surface-600'}`}
                    style={t.bg ? { backgroundColor: t.bg } : {}}>{t.label}</button>
                ))}
              </div>
            </div>
            {/* Font */}
            <div>
              <p className="text-xs text-surface-400 mb-2 font-medium flex items-center gap-1"><Type size={12} /> Font</p>
              <div className="flex flex-wrap gap-1.5">
                {FONTS.map(f => (
                  <button key={f.key} onClick={() => { setProfileFont(f.key); localStorage.setItem('waveify_profile_font', f.key) }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${profileFont === f.key ? 'bg-wave-500/20 text-wave-400 border border-wave-500/20' : 'bg-surface-800 text-surface-400 border border-transparent hover:border-surface-600'}`}
                    style={{ fontFamily: f.family }}>{f.label}</button>
                ))}
              </div>
            </div>
            {/* Avatar çerçevesi */}
            <div>
              <p className="text-xs text-surface-400 mb-2 font-medium flex items-center gap-1"><ImageIcon size={12} /> Avatar Çerçevesi</p>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_FRAMES.map(f => (
                  <button key={f.key} onClick={() => { setAvatarFrame(f.key); localStorage.setItem('waveify_avatar_frame', f.key) }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${avatarFrame === f.key ? 'bg-wave-500/20 text-wave-400 border border-wave-500/20' : 'bg-surface-800 text-surface-400 border border-transparent hover:border-surface-600'}`}>{f.label}</button>
                ))}
              </div>
            </div>
            {/* Layout */}
            <div>
              <p className="text-xs text-surface-400 mb-2 font-medium flex items-center gap-1"><Layout size={12} /> Şarkı Layout</p>
              <div className="flex flex-wrap gap-1.5">
                {LAYOUTS.map(l => (
                  <button key={l.key} onClick={() => { setLayout(l.key); localStorage.setItem('waveify_profile_layout', l.key) }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${layout === l.key ? 'bg-wave-500/20 text-wave-400 border border-wave-500/20' : 'bg-surface-800 text-surface-400 border border-transparent hover:border-surface-600'}`}>{l.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-surface-800 mt-4 pt-4">
            <div className="flex flex-wrap gap-4">
              {/* Gizli rozet isimleri */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showBadgeNames} onChange={() => { setShowBadgeNames(!showBadgeNames); localStorage.setItem('waveify_show_badge_names', String(!showBadgeNames)) }} className="rounded bg-surface-800 border-surface-600" />
                <span className="text-xs text-surface-400">Rozet isimlerini göster</span>
              </label>
              {/* Gizli profil */}
              {!isOwn && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={privacyMode} onChange={() => setPrivacyMode(!privacyMode)} className="rounded bg-surface-800 border-surface-600" />
                  <span className="text-xs text-surface-400"><EyeOff size={12} className="inline" /> Gizli profil</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Songs section */}
      <div className="px-8 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-200">{isOwn ? 'Şarkıların' : 'Şarkılar'}</h2>
          <span className="text-xs text-surface-500">{stats.songs} parça</span>
        </div>

        {userSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-surface-500">
            <Music2 size={40} className="mb-3 opacity-50" />
            <p className="text-sm">Henüz şarkı yok</p>
            {isOwn && <button onClick={() => navigate('/upload')} className="text-wave-400 hover:underline text-sm mt-2">İlk şarkını yükle</button>}
          </div>
        ) : viewMode === 'grid' ? (
          <div className={LAYOUTS.find(l => l.key === layout)?.cols || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'}>
            {sortedSongs.map((song) => (
              <div key={song.id} onClick={() => playSong(song)} className="group cursor-pointer">
                <div className="aspect-square rounded-xl overflow-hidden bg-surface-800 relative mb-2">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 size={32} className="text-surface-600" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-wave-500/90 flex items-center justify-center shadow-lg"><Play size={20} fill="white" className="text-white ml-1" /></div>
                  </div>
                  {song.album && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-surface-300 font-medium">{song.album}</div>}
                </div>
                <p className="text-sm font-medium truncate text-white group-hover:text-wave-400 transition-colors">{song.title}</p>
                <p className="text-xs text-surface-400 truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {albumGroups.map((group) => (
              <div key={group.name} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Disc3 size={14} className="text-wave-400" />
                  <span className="text-sm font-semibold text-surface-300">{group.name}</span>
                  <span className="text-[10px] text-surface-500">{group.songs.length} parça</span>
                </div>
                <div className="flex flex-col gap-0.5 ml-4 border-l border-surface-800 pl-3">
                  {group.songs.map((song) => (
                    <SongRow key={song.id} song={song} isOwn={isOwn} currentUser={currentUser} likedSongIds={likedSongIds} setLikedSongIds={setLikedSongIds}
                      onPlay={() => playSong(song)} onEdit={() => setEditSong(song)}
                      onDelete={() => { supabase.from('songs').delete().eq('id', song.id); setUserSongs((prev) => prev.filter((s) => s.id !== song.id)); setStats((prev) => ({ ...prev, songs: prev.songs - 1 })) }} />
                  ))}
                </div>
              </div>
            ))}
            {singles.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {albumGroups.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <Music2 size={14} className="text-surface-500" />
                    <span className="text-sm font-semibold text-surface-400">Single'lar</span>
                  </div>
                )}
                {singles.map((song) => (
                  <SongRow key={song.id} song={song} isOwn={isOwn} currentUser={currentUser} likedSongIds={likedSongIds} setLikedSongIds={setLikedSongIds}
                    onPlay={() => playSong(song)} onEdit={() => setEditSong(song)}
                    onDelete={() => { supabase.from('songs').delete().eq('id', song.id); setUserSongs((prev) => prev.filter((s) => s.id !== song.id)); setStats((prev) => ({ ...prev, songs: prev.songs - 1 })) }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editSong && (
        <SongEditModal song={editSong} open={!!editSong} onClose={() => setEditSong(null)}
          onSaved={(updated) => { setUserSongs((prev) => prev.map((s) => s.id === updated.id ? updated : s)); setEditSong(null) }}
          onDeleted={() => { setUserSongs((prev) => prev.filter((s) => s.id !== editSong.id)); setStats((prev) => ({ ...prev, songs: prev.songs - 1 })); setEditSong(null) }} />
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
          <div className="w-9 h-9 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0"><Music2 size={14} className="text-surface-500" /></div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white">{song.title}</p>
          <p className="text-xs text-surface-400 truncate">{song.artist}</p>
        </div>
        <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
      </div>
      {isOwn && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={async (e) => { e.stopPropagation(); const isLiked = likedSongIds.has(song.id); if (isLiked) { await supabase.from('likes').delete().eq('user_id', currentUser!.id).eq('song_id', song.id); likedSongIds.delete(song.id) } else { await supabase.from('likes').insert({ user_id: currentUser!.id, song_id: song.id }); likedSongIds.add(song.id) } setLikedSongIds((prev) => new Set(prev)) }}
            className={`p-1 rounded-lg transition-colors ${likedSongIds.has(song.id) ? 'text-red-400' : 'text-surface-500 hover:text-red-400'}`}>
            <Heart size={13} fill={likedSongIds.has(song.id) ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="text-surface-500 hover:text-wave-400 transition-colors p-1"><Pencil size={13} /></button>
          <button onClick={async (e) => { e.stopPropagation(); if (!confirm('Bu şarkıyı silmek istediğine emin misin?')) return; onDelete() }} className="text-surface-500 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  )
}