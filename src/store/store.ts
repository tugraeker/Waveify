import { create } from 'zustand'
import type { User, Song, Playlist, EqualizerSettings, SyncRoom, VisualizerMode, SleepTimer, AccentColor, Activity, Badge } from '@/types'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void
  currentSong: Song | null
  setCurrentSong: (song: Song | null) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  currentTime: number
  setCurrentTime: (time: number) => void
  volume: number
  setVolume: (vol: number) => void
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  shuffle: boolean
  setShuffle: (shuffle: boolean) => void
  repeat: 'off' | 'all' | 'one'
  setRepeat: (repeat: 'off' | 'all' | 'one') => void
  queue: Song[]
  setQueue: (queue: Song[]) => void
  addToQueue: (song: Song) => void
  removeFromQueue: (index: number) => void
  equalizer: EqualizerSettings
  setEqualizer: (eq: EqualizerSettings) => void
  resetEqualizer: () => void
  songs: Song[]
  setSongs: (songs: Song[]) => void
  playlists: Playlist[]
  setPlaylists: (playlists: Playlist[]) => void
  activePlaylist: Playlist | null
  setActivePlaylist: (playlist: Playlist | null) => void
  sidebarView: 'home' | 'search' | 'library' | 'upload' | 'friends' | 'chat'
  setSidebarView: (view: 'home' | 'search' | 'library' | 'upload' | 'friends' | 'chat') => void
  syncRoom: SyncRoom | null
  setSyncRoom: (room: SyncRoom | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  visualizerMode: VisualizerMode
  setVisualizerMode: (mode: VisualizerMode) => void
  sleepTimer: SleepTimer
  setSleepTimer: (timer: SleepTimer) => void
  songHistory: Song[]
  addToHistory: (song: Song) => void
  miniPlayer: boolean
  setMiniPlayer: (v: boolean) => void
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
  activities: Activity[]
  setActivities: (activities: Activity[]) => void
  badges: Badge[]
  setBadges: (badges: Badge[]) => void
}

const defaultEqualizer: EqualizerSettings = { bass: 0, mid: 0, treble: 0 }

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentSong: null,
  setCurrentSong: (song) => set({ currentSong: song }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  volume: 0.7,
  setVolume: (vol) => set({ volume: vol }),
  playbackRate: 1,
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  shuffle: false,
  setShuffle: (shuffle) => set({ shuffle }),
  repeat: 'off',
  setRepeat: (repeat) => set({ repeat }),
  queue: [],
  setQueue: (queue) => set({ queue }),
  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
  removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  equalizer: { bass: 0, mid: 0, treble: 0 },
  setEqualizer: (eq) => set({ equalizer: eq }),
  resetEqualizer: () => set({ equalizer: { bass: 0, mid: 0, treble: 0 } }),
  songs: [],
  setSongs: (songs) => set({ songs }),
  playlists: [],
  setPlaylists: (playlists) => set({ playlists }),
  activePlaylist: null,
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
  sidebarView: 'home',
  setSidebarView: (view) => set({ sidebarView: view }),
  syncRoom: null,
  setSyncRoom: (room) => set({ syncRoom: room }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  visualizerMode: 'bars',
  setVisualizerMode: (mode) => set({ visualizerMode: mode }),
  sleepTimer: { remaining: 0, endOfSong: false, active: false },
  setSleepTimer: (timer) => set({ sleepTimer: timer }),
  songHistory: [],
  addToHistory: (song) => set((state) => {
    const filtered = state.songHistory.filter((s) => s.id !== song.id)
    return { songHistory: [song, ...filtered].slice(0, 50) }
  }),
  miniPlayer: false,
  setMiniPlayer: (v) => set({ miniPlayer: v }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  accentColor: 'wave',
  setAccentColor: (color) => set({ accentColor: color }),
  activities: [],
  setActivities: (activities) => set({ activities }),
  badges: [],
  setBadges: (badges) => set({ badges }),
}))
