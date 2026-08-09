import type { Song } from '@/types'

export interface Mood {
  key: string
  label: string
  emoji: string
  gradient: string
  match: (song: Song) => boolean
}

function bpmIn(song: Song, min: number, max: number) {
  const bpm = song.bpm
  return !bpm || (bpm >= min && bpm <= max)
}

function genreIn(song: Song, genres: string[]) {
  if (!song.genre) return false
  const g = song.genre.toLowerCase()
  return genres.some((x) => x === g || g.includes(x))
}

export const MOODS: Mood[] = [
  {
    key: 'focus',
    label: 'Odak',
    emoji: '🎯',
    gradient: 'from-indigo-500 to-blue-600',
    match: (s) => bpmIn(s, 80, 115) && !genreIn(s, ['rock', 'metal', 'rap', 'hip-hop', 'pop', 'dance', 'edm']),
  },
  {
    key: 'energy',
    label: 'Enerji',
    emoji: '⚡',
    gradient: 'from-orange-500 to-red-600',
    match: (s) => bpmIn(s, 120, 180) && !genreIn(s, ['lofi', 'ambient', 'classical', 'jazz']),
  },
  {
    key: 'relax',
    label: 'Rahatlama',
    emoji: '🌿',
    gradient: 'from-emerald-500 to-teal-600',
    match: (s) => bpmIn(s, 55, 90) && !genreIn(s, ['metal', 'hardstyle', 'dubstep']),
  },
  {
    key: 'party',
    label: 'Parti',
    emoji: '🎉',
    gradient: 'from-fuchsia-500 to-purple-600',
    match: (s) => bpmIn(s, 110, 160) && genreIn(s, ['dance', 'edm', 'pop', 'hip-hop', 'rap', 'electronic', 'house']),
  },
  {
    key: 'night',
    label: 'Gece',
    emoji: '🌙',
    gradient: 'from-slate-700 to-black',
    match: (s) => bpmIn(s, 60, 100) && genreIn(s, ['lofi', 'chill', 'ambient', 'r&b', 'rnb', 'soul', 'trap']),
  },
  {
    key: 'workout',
    label: 'Spor',
    emoji: '🏋️',
    gradient: 'from-lime-500 to-green-600',
    match: (s) => bpmIn(s, 125, 185) && !genreIn(s, ['lofi', 'ambient', 'classical']),
  },
]

export function generateMoodPlaylist(mood: Mood, songs: Song[]): Song[] {
  const matched = songs.filter((s) => mood.match(s))
  if (matched.length < 8) return [...matched].sort(() => Math.random() - 0.5).slice(0, 40)
  return [...matched].sort(() => Math.random() - 0.5).slice(0, 40)
}