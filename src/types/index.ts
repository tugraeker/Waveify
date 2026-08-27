export interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  is_admin?: boolean
  accent_color?: AccentColor
  display_settings?: Record<string, any>
  created_at: string
}

export interface Song {
  id: string
  user_id: string
  title: string
  artist: string
  album?: string
  genre?: string
  duration: number
  cover_url?: string
  audio_url: string
  lyrics?: string
  created_at: string
  user?: User
  likes_count?: number
  liked_by_user?: boolean
  year?: number
  track_number?: number
  bpm?: number
  key?: string
}

export interface SongNote {
  song_id: string
  text: string
  created_at: string
}

export interface SongRating {
  song_id: string
  rating: number
}

export interface Playlist {
  id: string
  user_id: string
  name: string
  description?: string
  cover_url?: string
  type: 'custom' | 'auto'
  auto_type?: 'top50' | 'friends_top' | 'weekly' | 'latest' | 'liked'
  is_collaborative?: boolean
  created_at: string
  songs?: Song[]
  song_count?: number
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  created_at: string
  friend?: User
}

export interface SyncRoom {
  id: string
  name: string
  host_id: string
  current_song?: Song
  is_playing: boolean
  current_time: number
  queue: Song[]
  listeners: User[]
  created_at: string
}

export interface Comment {
  id: string
  song_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

export interface EqualizerSettings {
  bass: number
  mid: number
  treble: number
  bands?: number[]
}

export interface AudioEffects {
  bass: number
  reverb: number
  spatial: number
  vocal?: number
  vocalIso?: boolean
  eightD?: number
  room?: 'hall' | 'cathedral' | 'garage' | 'canyon'
}

export const ROOM_PRESETS: { key: 'hall' | 'cathedral' | 'garage' | 'canyon'; label: string; decay: number; mix: number }[] = [
  { key: 'hall', label: 'Konser Salonu', decay: 1.6, mix: 0.35 },
  { key: 'cathedral', label: 'Katedral', decay: 3.2, mix: 0.5 },
  { key: 'garage', label: 'Garaj', decay: 0.7, mix: 0.25 },
  { key: 'canyon', label: 'Kanyon', decay: 2.3, mix: 0.4 },
]

export type CoverStyle = 'vinyl' | 'cassette' | 'cd' | 'polaroid'

export interface RadioState {
  active: boolean
  seedId: string | null
}

export const EQ_BAND_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export function defaultEqBands(): number[] {
  return EQ_BAND_FREQS.map(() => 0)
}

export const EQ_PRESETS: { name: string; bands: number[] }[] = [
  { name: 'Normal', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Rock', bands: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4] },
  { name: 'Pop', bands: [-1, 0, 2, 3, 2, 0, -1, -1, 0, 1] },
  { name: 'Jazz', bands: [3, 2, 1, 1, 0, 0, 1, 2, 3, 4] },
  { name: 'Classical', bands: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4] },
  { name: 'Bass Boost', bands: [6, 5, 4, 3, 1, 0, -1, -1, 0, 1] },
  { name: 'Treble Boost', bands: [-1, 0, 0, 1, 1, 2, 3, 4, 5, 6] },
  { name: 'Vocal', bands: [-1, -1, 0, 1, 3, 4, 3, 1, 0, -1] },
  { name: 'Electronic', bands: [4, 3, 2, 1, 0, -1, 0, 2, 3, 5] },
  { name: 'Hip Hop', bands: [5, 4, 3, 2, 0, -1, -1, 0, 1, 2] },
]

export interface EqPreset extends EqualizerSettings {
  name: string
  bands: number[]
}

export type VisualizerMode = 'bars' | 'wave' | 'circle' | 'fire' | 'party' | 'spectrum' | 'particles' | 'dual' | 'stars' | 'concert'

export type VisualizerColorTheme = 'wave' | 'rainbow' | 'fire' | 'ice' | 'neon' | 'pastel' | 'mono'

export interface SleepTimer {
  remaining: number
  endOfSong: boolean
  active: boolean
  fadeOut?: boolean
}

export interface Activity {
  id: string
  user_id: string
  type: 'listen' | 'like' | 'playlist_add' | 'follow' | 'import'
  data?: any
  created_at: string
  user?: User
  song?: Song
}

export interface Badge {
  id: string
  user_id: string
  badge_type: string
  label?: string
  color?: string
  icon_url?: string
  granted_by?: string
  created_at: string
}

export const BADGE_DEFS: { type: string; label: string; color: string; category: 'admin' | 'achievement'; desc: string; icon: string }[] = [
  { type: 'verified', label: 'Doğrulanmış Hesap', color: '#3b82f6', category: 'admin', desc: 'Resmi olarak doğrulanmış hesap', icon: 'verified' },
  { type: 'artist', label: 'Sanatçı', color: '#8b5cf6', category: 'admin', desc: 'Platform sanatçısı', icon: 'artist' },
  { type: 'dj', label: 'DJ', color: '#22c7c0', category: 'admin', desc: 'DJ rütbesi', icon: 'dj' },
  { type: 'producer', label: 'Prodüktör', color: '#a855f7', category: 'admin', desc: 'Müzik prodüktörü', icon: 'producer' },
  { type: 'moderator', label: 'Moderatör', color: '#10b981', category: 'admin', desc: 'Topluluk moderatörü', icon: 'mod' },
  { type: 'vip', label: 'VIP', color: '#f59e0b', category: 'admin', desc: 'Özel üye', icon: 'vip' },
  { type: 'early', label: 'Erken Kuş', color: '#ec4899', category: 'admin', desc: 'İlk kullanıcılardan', icon: 'early' },
  { type: 'contributor', label: 'Katkıda Bulunan', color: '#f97316', category: 'admin', desc: 'Platforma katkı sağlayan', icon: 'contributor' },
  { type: 'beta_tester', label: 'Beta Testçisi', color: '#6366f1', category: 'admin', desc: 'Beta sürümü test eden', icon: 'beta' },
  { type: 'hall_of_fame', label: 'Onur Listesi', color: '#fbbf24', category: 'admin', desc: 'Platform tarihine geçen', icon: 'hall' },
  { type: 'ambassador', label: 'Elçi', color: '#06b6d4', category: 'admin', desc: 'Waveify elçisi', icon: 'ambassador' },
  { type: 'legend', label: 'Efsane', color: '#a855f7', category: 'admin', desc: 'Efsanevi kullanıcı', icon: 'legend' },
  { type: 'supporter', label: 'Destekçi', color: '#f43f5e', category: 'admin', desc: 'Platform destekçisi', icon: 'supporter' },
  { type: 'streak_7', label: '7 Günlük Seri', color: '#22c7c0', category: 'achievement', desc: '7 gün üst üste dinleme', icon: 'streak' },
  { type: 'streak_30', label: '30 Günlük Seri', color: '#f59e0b', category: 'achievement', desc: '30 gün üst üste dinleme', icon: 'streak' },
  { type: 'streak_100', label: '100 Gün Seri', color: '#ec4899', category: 'achievement', desc: '100 gün üst üste dinleme', icon: 'streak' },
  { type: 'streak_365', label: 'Bir Yıllık Seri', color: '#8b5cf6', category: 'achievement', desc: '365 gün üst üste dinleme', icon: 'streak' },
  { type: 'listener_100', label: '100 Şarkı', color: '#8b5cf6', category: 'achievement', desc: '100 şarkı dinle', icon: 'headphones' },
  { type: 'listener_1000', label: '1.000 Şarkı', color: '#ec4899', category: 'achievement', desc: '1.000 şarkı dinle', icon: 'headphones' },
  { type: 'listener_5000', label: '5.000 Şarkı (Audiophile)', color: '#f59e0b', category: 'achievement', desc: '5.000 şarkı dinle', icon: 'headphones' },
  { type: 'listener_10000', label: '10.000 Şarkı (Efsane)', color: '#22c7c0', category: 'achievement', desc: '10.000 şarkı dinle', icon: 'headphones' },
  { type: 'liker_50', label: '50 Beğeni', color: '#ef4444', category: 'achievement', desc: '50 şarkı beğen', icon: 'heart' },
  { type: 'liker_200', label: '200 Beğeni', color: '#ef4444', category: 'achievement', desc: '200 şarkı beğen', icon: 'heart' },
  { type: 'liker_500', label: '500 Beğeni (Koleksiyoncu)', color: '#ec4899', category: 'achievement', desc: '500 şarkı beğen', icon: 'heart' },
  { type: 'upload_1', label: 'İlk Yükleme', color: '#10b981', category: 'achievement', desc: 'İlk şarkını yükle', icon: 'upload' },
  { type: 'upload_10', label: 'Yükleyici', color: '#22c7c0', category: 'achievement', desc: '10 şarkı yükle', icon: 'upload' },
  { type: 'upload_50', label: 'Kütüphane', color: '#3b82f6', category: 'achievement', desc: '50 şarkı yükle', icon: 'upload' },
  { type: 'playlist_3', label: 'Küratör', color: '#f97316', category: 'achievement', desc: '3 çalma listesi oluştur', icon: 'playlist' },
  { type: 'playlist_10', label: 'Usta Küratör', color: '#8b5cf6', category: 'achievement', desc: '10 çalma listesi oluştur', icon: 'playlist' },
  { type: 'import_5', label: 'İçe Aktarıcı', color: '#06b6d4', category: 'achievement', desc: '5 şarkı içe aktar', icon: 'import' },
  { type: 'import_25', label: 'Arşivci', color: '#6366f1', category: 'achievement', desc: '25 şarkı içe aktar', icon: 'import' },
  { type: 'friend_5', label: 'Sosyal', color: '#f43f5e', category: 'achievement', desc: '5 arkadaş ekle', icon: 'friends' },
  { type: 'friend_20', label: 'Popüler', color: '#ec4899', category: 'achievement', desc: '20 arkadaş ekle', icon: 'friends' },
  { type: 'chat_100', label: 'Konuşkan', color: '#22c7c0', category: 'achievement', desc: '100 sohbet mesajı gönder', icon: 'chat' },
  { type: 'popular_10', label: 'Yükselen Yıldız', color: '#f59e0b', category: 'achievement', desc: 'Şarkıların toplam 10 beğeni alsın', icon: 'star' },
  { type: 'popular_100', label: 'Vitrin Sanatçısı', color: '#8b5cf6', category: 'achievement', desc: 'Şarkıların toplam 100 beğeni alsın', icon: 'star' },
]

export interface LevelInfo {
  xp: number
  level: number
  nextLevelXp: number
}

export const XP_RATES = {
  listen: 1,
  like: 2,
  upload: 10,
  importSong: 5,
  comment: 3,
  addFriend: 15,
  createPlaylist: 5,
  dailyVisit: 3,
} as const

export function xpForLevel(level: number): number {
  return level * 100
}

export function computeLevel(totalXp: number): LevelInfo {
  let level = 1
  let needed = 0
  while (true) {
    needed = xpForLevel(level)
    if (totalXp < needed) break
    totalXp -= needed
    level++
  }
  return { xp: totalXp, level: level - 1, nextLevelXp: needed }
}

export interface LooseBadgeDef {
  type: string
  label: string
  color: string
  category: 'admin' | 'achievement'
  desc: string
  icon: string
}

export type AccentColor = 'wave'
