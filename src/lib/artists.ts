const KEY = 'waveify_followed_artists'

export function getFollowedArtists(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function isFollowing(artist: string): boolean {
  return getFollowedArtists().includes(artist)
}

export function toggleFollow(artist: string): boolean {
  if (!artist) return false
  const list = getFollowedArtists()
  const exists = list.includes(artist)
  const next = exists ? list.filter((a) => a !== artist) : [...list, artist]
  localStorage.setItem(KEY, JSON.stringify(next))
  return !exists
}