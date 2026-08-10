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

export function trackRadioPlay() {
  const s = getStats()
  s.radioPlays = (s.radioPlays || 0) + 1
  saveStats(s)
  return s
}

export function trackEffectsUse() {
  const s = getStats()
  s.effectsUsed = (s.effectsUsed || 0) + 1
  saveStats(s)
  return s
}

export function trackTriviaPlay() {
  const s = getStats()
  s.triviaPlays = (s.triviaPlays || 0) + 1
  saveStats(s)
  return s
}

export function trackFullListen() {
  const s = getStats()
  s.fullListens = (s.fullListens || 0) + 1
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

// Quest system
const QUESTS_KEY = 'waveify_quests'
const WEEKLY_QUESTS_KEY = 'waveify_weekly_quests'

export interface Quest {
  id: string
  label: string
  type: string
  target: number
  reward: number
  progress: number
  completed: boolean
  claimed: boolean
}

export function getDailyQuests(): Quest[] {
  const today = new Date().toDateString()
  const raw = localStorage.getItem(QUESTS_KEY)
  const data = raw ? JSON.parse(raw) : {}
  if (data.date === today && data.quests) return data.quests

  const stats = getStats()
  const quests: Quest[] = [
    { id: 'daily_listen', label: 'Şarkı Dinle', type: 'listen', target: 10, reward: 5, progress: Math.min(stats.songsListened % 100, 10), completed: false, claimed: false },
    { id: 'daily_like', label: 'Beğeni Yap', type: 'like', target: 5, reward: 3, progress: Math.min(stats.likesGiven % 50, 5), completed: false, claimed: false },
    { id: 'daily_upload', label: 'Şarkı Yükle', type: 'upload', target: 1, reward: 10, progress: Math.min(stats.songsUploaded % 10, 1), completed: false, claimed: false },
    { id: 'daily_radio', label: 'Radyo Modunda Dinle', type: 'radio', target: 5, reward: 8, progress: Math.min(stats.radioPlays % 50, 5), completed: false, claimed: false },
    { id: 'daily_effects', label: 'Efektli Şarkı Dinle', type: 'effects', target: 3, reward: 6, progress: Math.min(stats.effectsUsed % 30, 3), completed: false, claimed: false },
    { id: 'daily_trivia', label: 'Şarkı Tahmini Yap', type: 'trivia', target: 1, reward: 5, progress: Math.min((stats.triviaPlays || 0) % 10, 1), completed: false, claimed: false },
    { id: 'daily_full', label: 'Şarkıyı Sonuna Kadar Dinle', type: 'full_listen', target: 3, reward: 10, progress: Math.min((stats.fullListens || 0) % 20, 3), completed: false, claimed: false },
  ]
  quests.forEach(q => q.completed = q.progress >= q.target)
  localStorage.setItem(QUESTS_KEY, JSON.stringify({ date: today, quests }))
  return quests
}

export function claimQuest(id: string): boolean {
  const quests = getDailyQuests()
  const q = quests.find(q => q.id === id)
  if (!q || !q.completed || q.claimed) return false
  q.claimed = true
  awardXp(q.reward)
  localStorage.setItem(QUESTS_KEY, JSON.stringify({ date: new Date().toDateString(), quests }))
  return true
}

export function getWeeklyQuests(): Quest[] {
  const week = getWeekId()
  const raw = localStorage.getItem(WEEKLY_QUESTS_KEY)
  const data = raw ? JSON.parse(raw) : {}
  if (data.week === week && data.quests) return data.quests

  const stats = getStats()
  const quests: Quest[] = [
    { id: 'weekly_listen', label: 'Şarkı Dinle', type: 'listen', target: 100, reward: 25, progress: Math.min(stats.songsListened % 500, 100), completed: false, claimed: false },
    { id: 'weekly_like', label: 'Beğeni Yap', type: 'like', target: 25, reward: 15, progress: Math.min(stats.likesGiven % 200, 25), completed: false, claimed: false },
    { id: 'weekly_upload', label: 'Şarkı Yükle', type: 'upload', target: 5, reward: 50, progress: Math.min(stats.songsUploaded % 50, 5), completed: false, claimed: false },
    { id: 'weekly_friend', label: 'Arkadaş Ekle', type: 'friend', target: 3, reward: 30, progress: Math.min(stats.friendsAdded % 20, 3), completed: false, claimed: false },
    { id: 'weekly_radio', label: 'Radyo Modunda Dinle', type: 'radio', target: 25, reward: 35, progress: Math.min(stats.radioPlays % 200, 25), completed: false, claimed: false },
    { id: 'weekly_effects', label: 'Efektli Şarkı Dinle', type: 'effects', target: 15, reward: 30, progress: Math.min(stats.effectsUsed % 150, 15), completed: false, claimed: false },
  ]
  quests.forEach(q => q.completed = q.progress >= q.target)
  localStorage.setItem(WEEKLY_QUESTS_KEY, JSON.stringify({ week, quests }))
  return quests
}

function getWeekId(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
  return `${now.getFullYear()}-W${week}`
}

export function getMonthlyReport() {
  const stats = getStats()
  const month = new Date().toLocaleString('tr-TR', { month: 'long', year: 'numeric' })
  return {
    month,
    songsListened: stats.songsListened,
    likesGiven: stats.likesGiven,
    songsUploaded: stats.songsUploaded,
    importsDone: stats.importsDone,
    friendsAdded: stats.friendsAdded,
    chatMessages: stats.chatMessages,
    daysActive: stats.daysActive,
    totalXp: getXpTotal(),
  }
}

export function isXpBonusDay(): boolean {
  const today = new Date()
  const day = today.getDay()
  return day === 0 || day === 6 // Weekend double XP
}

export function getHolidayBadges(): { type: string; label: string; color: string; date: string }[] {
  const now = new Date()
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (m === 1 && d === 1) return [{ type: 'new_year', label: 'Yılbaşı 2026', color: '#fbbf24', date: '2026-01-01' }]
  if (m === 4 && d === 23) return [{ type: 'national_sovereignty', label: '23 Nisan', color: '#ef4444', date: '2026-04-23' }]
  if (m === 5 && d === 19) return [{ type: 'youth_sports', label: '19 Mayıs', color: '#22c7c0', date: '2026-05-19' }]
  if (m === 10 && d === 29) return [{ type: 'republic_day', label: '29 Ekim', color: '#ef4444', date: '2026-10-29' }]
  if (m === 12 && d === 31) return [{ type: 'new_year_eve', label: 'Yılbaşı Gecesi', color: '#fbbf24', date: '2026-12-31' }]
  if (m === 2 && d === 14) return [{ type: 'valentine', label: 'Sevgililer Günü', color: '#ec4899', date: '2026-02-14' }]
  return []
}