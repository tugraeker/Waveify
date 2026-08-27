import { create } from 'zustand'
import type { User, Song, Playlist, EqualizerSettings, AudioEffects, RadioState, SyncRoom, VisualizerMode, SleepTimer, AccentColor, Activity, Badge, EqPreset, VisualizerColorTheme, SongNote, SongRating, CoverStyle } from '@/types'
import { defaultEqBands, EQ_PRESETS } from '@/types'

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
  audioEffects: AudioEffects
  setAudioEffects: (fx: AudioEffects) => void
  radio: RadioState
  setRadio: (radio: RadioState) => void
  eqPresets: EqPreset[]
  setEqPresets: (presets: EqPreset[]) => void
  saveEqPreset: (name: string) => void
  deleteEqPreset: (name: string) => void
  loadEqPreset: (preset: EqPreset) => void
  crossfade: boolean
  setCrossfade: (v: boolean) => void
  crossfadeDuration: number
  setCrossfadeDuration: (v: number) => void
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
  visualizerColorTheme: VisualizerColorTheme
  setVisualizerColorTheme: (theme: VisualizerColorTheme) => void
  visualizerSensitivity: number
  setVisualizerSensitivity: (v: number) => void
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
  unreadNotifCount: number
  setUnreadNotifCount: (n: number) => void
  showEqInPlayer: boolean
  setShowEqInPlayer: (v: boolean) => void
  songRatings: Record<string, number>
  setSongRating: (songId: string, rating: number) => void
  songNotes: Record<string, string>
  setSongNote: (songId: string, note: string) => void
  seekStep: number
  setSeekStep: (s: number) => void
  smartShuffle: boolean
  setSmartShuffle: (v: boolean) => void
  normalize: boolean
  setNormalize: (v: boolean) => void
  coverStyle: CoverStyle
  setCoverStyle: (s: CoverStyle) => void
  hotkeys: Record<string, string>
  setHotkeys: (h: Record<string, string>) => void
  profileName: string
  setProfileName: (v: string) => void
  smartCache: boolean
  setSmartCache: (v: boolean) => void
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

const defaultEqualizer: EqualizerSettings = { bass: 0, mid: 0, treble: 0, bands: defaultEqBands() }

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
  equalizer: { ...defaultEqualizer, bands: loadJson<number[]>('waveify_eq_bands', defaultEqBands()) },
  setEqualizer: (eq) => set({ equalizer: eq }),
  resetEqualizer: () => set({ equalizer: { ...defaultEqualizer, bands: defaultEqBands() } }),
  audioEffects: loadJson<AudioEffects>('waveify_audio_effects', { bass: 0, reverb: 0, spatial: 0, vocal: 0, vocalIso: false, eightD: 0, room: 'hall' }),
  setAudioEffects: (fx) => { localStorage.setItem('waveify_audio_effects', JSON.stringify(fx)); set({ audioEffects: fx }) },
  radio: { active: false, seedId: null },
  setRadio: (radio) => set({ radio }),
  eqPresets: loadJson<EqPreset[]>('waveify_eq_presets', []),
  setEqPresets: (presets) => { localStorage.setItem('waveify_eq_presets', JSON.stringify(presets)); set({ eqPresets: presets }) },
  saveEqPreset: (name) => set((state) => {
    const existing = state.eqPresets.findIndex(p => p.name === name)
    let presets = [...state.eqPresets]
    const newPreset: EqPreset = { name, ...state.equalizer, bands: [...(state.equalizer.bands || defaultEqBands())] }
    if (existing >= 0) presets[existing] = newPreset
    else presets = [...presets, newPreset]
    localStorage.setItem('waveify_eq_presets', JSON.stringify(presets))
    return { eqPresets: presets }
  }),
  deleteEqPreset: (name) => set((state) => {
    const presets = state.eqPresets.filter(p => p.name !== name)
    localStorage.setItem('waveify_eq_presets', JSON.stringify(presets))
    return { eqPresets: presets }
  }),
  loadEqPreset: (preset) => set({ equalizer: { bass: preset.bass, mid: preset.mid, treble: preset.treble, bands: [...(preset.bands || defaultEqBands())] } }),
  crossfade: loadJson<boolean>('waveify_crossfade', false),
  setCrossfade: (v) => { localStorage.setItem('waveify_crossfade', JSON.stringify(v)); set({ crossfade: v }) },
  crossfadeDuration: loadJson<number>('waveify_crossfade_duration', 3),
  setCrossfadeDuration: (v) => { localStorage.setItem('waveify_crossfade_duration', JSON.stringify(v)); set({ crossfadeDuration: v }) },
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
  visualizerColorTheme: loadJson<VisualizerColorTheme>('waveify_viz_theme', 'wave'),
  setVisualizerColorTheme: (theme) => { localStorage.setItem('waveify_viz_theme', theme); set({ visualizerColorTheme: theme }) },
  visualizerSensitivity: loadJson<number>('waveify_viz_sensitivity', 1),
  setVisualizerSensitivity: (v) => { localStorage.setItem('waveify_viz_sensitivity', JSON.stringify(v)); set({ visualizerSensitivity: v }) },
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
  unreadNotifCount: 0,
  setUnreadNotifCount: (n) => set({ unreadNotifCount: n }),
  showEqInPlayer: false,
  setShowEqInPlayer: (v) => set({ showEqInPlayer: v }),
  songRatings: loadJson<Record<string, number>>('waveify_song_ratings', {}),
  setSongRating: (songId, rating) => set((state) => {
    const ratings = { ...state.songRatings, [songId]: rating }
    localStorage.setItem('waveify_song_ratings', JSON.stringify(ratings))
    return { songRatings: ratings }
  }),
songNotes: loadJson<Record<string, string>>('waveify_song_notes', {}),
  setSongNote: (songId, note) => set((state) => {
    const notes = { ...state.songNotes, [songId]: note }
    localStorage.setItem('waveify_song_notes', JSON.stringify(notes))
    return { songNotes: notes }
  }),
  seekStep: loadJson<number>('waveify_seek_step', 15),
  setSeekStep: (s) => { localStorage.setItem('waveify_seek_step', JSON.stringify(s)); set({ seekStep: s }) },
  smartShuffle: loadJson<boolean>('waveify_smart_shuffle', true),
  setSmartShuffle: (v) => { localStorage.setItem('waveify_smart_shuffle', JSON.stringify(v)); set({ smartShuffle: v }) },
  normalize: loadJson<boolean>('waveify_normalize', false),
  setNormalize: (v) => { localStorage.setItem('waveify_normalize', JSON.stringify(v)); set({ normalize: v }) },
  coverStyle: loadJson<CoverStyle>('waveify_cover_style', 'vinyl'),
  setCoverStyle: (s) => { localStorage.setItem('waveify_cover_style', s); set({ coverStyle: s }) },
  hotkeys: loadJson<Record<string, string>>('waveify_hotkeys', { Space: 'playpause', ArrowRight: 'next', ArrowLeft: 'prev', ArrowUp: 'volumeup', ArrowDown: 'volumedown', KeyM: 'mute', KeyN: 'shuffle', KeyR: 'repeat' }),
  setHotkeys: (h) => { localStorage.setItem('waveify_hotkeys', JSON.stringify(h)); set({ hotkeys: h }) },
  profileName: localStorage.getItem('waveify_profile_name') || '',
  setProfileName: (v) => { localStorage.setItem('waveify_profile_name', v); set({ profileName: v }) },
  smartCache: loadJson<boolean>('waveify_smart_cache', true),
  setSmartCache: (v) => { localStorage.setItem('waveify_smart_cache', JSON.stringify(v)); set({ smartCache: v }) },
}))
