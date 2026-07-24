export function getStats() {
  try {
    const raw = localStorage.getItem('waveify_stats')
    return raw ? JSON.parse(raw) : { songsListened: 0, likesGiven: 0, daysActive: 0, lastActiveDate: '' }
  } catch { return { songsListened: 0, likesGiven: 0, daysActive: 0, lastActiveDate: '' } }
}

function saveStats(s: any) {
  localStorage.setItem('waveify_stats', JSON.stringify(s))
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
