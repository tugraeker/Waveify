export interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  bio?: string
  is_admin?: boolean
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
}

export type VisualizerMode = 'bars' | 'wave' | 'circle' | 'fire'

export interface SleepTimer {
  remaining: number
  endOfSong: boolean
  active: boolean
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

export const BADGE_DEFS: { type: string; label: string; color: string }[] = [
  { type: 'verified', label: 'Doğrulanmış Hesap', color: '#3b82f6' },
  { type: 'artist', label: 'Sanatçı', color: '#8b5cf6' },
  { type: 'dj', label: 'DJ', color: '#22c7c0' },
  { type: 'moderator', label: 'Moderatör', color: '#10b981' },
  { type: 'vip', label: 'VIP', color: '#f59e0b' },
  { type: 'early', label: 'Erken Kuş', color: '#ec4899' },
  { type: 'contributor', label: 'Katkıda Bulunan', color: '#f97316' },
]

export type AccentColor = 'wave' | 'purple' | 'green' | 'blue' | 'warm' | 'pink' | 'classic'
