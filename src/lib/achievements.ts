const STATS_KEY = 'waveify_stats'
const XP_KEY = 'waveify_xp'

export function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    return raw ? JSON.parse(raw) : { songsListened: 0, likesGiven: 0, daysActive: 0, lastActiveDate: '', songsUploaded: 0, importsDone: 0, playlistsCreated: 0, friendsAdded: 0, chatMessages: 0, totalLikesOnSongs: 0 }
  } catch { return { songsListened: 0, likesGiven: 0, daysActive: 0, lastActiveDate: '', songsUploaded: 0, importsDone: 0, playlistsCreated: 0, friendsAdded: 0, chatMessages: 0, totalLikesOnSongs: 0 } }
}

function saveStats(s: any) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s))
}

export function getXpTotal(): number {
  try { return Number(localStorage.getItem(XP_KEY)) || 0 } catch { return 0 }
}

export function awardXp(amount: number): number {
  const total = getXpTotal() + amount
  localStorage.setItem(XP_KEY, String(total))
  return total
}

export function trackListen() {
  const s = getStats()
  s.songsListened = (s.songsListened || 0) + 1
  saveStats(s)
  return s
}

export function trackLike() {
  const s = getStats()
  s.likesGiven = (s.likesGiven || 0) + 1
  saveStats(s)
  return s
}

export function trackUpload() {
  const s = getStats()
  s.songsUploaded = (s.songsUploaded || 0) + 1
  saveStats(s)
  return s
}

export function trackImport() {
  const s = getStats()
  s.importsDone = (s.importsDone || 0) + 1
  saveStats(s)
  return s
}

export function trackPlaylist() {
  const s = getStats()
  s.playlistsCreated = (s.playlistsCreated || 0) + 1
  saveStats(s)
  return s
}

export function trackFriend() {
  const s = getStats()
  s.friendsAdded = (s.friendsAdded || 0) + 1
  saveStats(s)
  return s
}

export function trackChatMessage() {
  const s = getStats()
  s.chatMessages = (s.chatMessages || 0) + 1
  saveStats(s)
  return s
}

export function trackSongLiked(songUserId: string, currentUserId: string) {
  if (songUserId === currentUserId) {
    const s = getStats()
    s.totalLikesOnSongs = (s.totalLikesOnSongs || 0) + 1
    saveStats(s)
    return s
  }
  return getStats()
}

export function updateStreak() {
  const s = getStats()
  const today = new Date().toDateString()
  if (s.lastActiveDate !== today) {
    s.daysActive = (s.daysActive || 0) + 1
    s.lastActiveDate = today
    saveStats(s)
  }
  return s
}