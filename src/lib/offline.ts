const CACHE_NAME = 'waveify-audio-v1'

export async function cacheAudio(url: string): Promise<boolean> {
  if (!url || typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(CACHE_NAME)
    if (await cache.match(url)) return true
    const res = await fetch(url)
    if (!res.ok) return false
    await cache.put(url, res.clone())
    return true
  } catch { return false }
}

export async function removeCachedAudio(url: string): Promise<boolean> {
  if (!url || typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(CACHE_NAME)
    return await cache.delete(url)
  } catch { return false }
}

export async function isAudioCached(url: string): Promise<boolean> {
  if (!url || typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(CACHE_NAME)
    return !!await cache.match(url)
  } catch { return false }
}

export async function resolveAudioUrl(url: string): Promise<string> {
  if (!url || typeof caches === 'undefined') return url
  try {
    const cache = await caches.open(CACHE_NAME)
    const hit = await cache.match(url)
    if (hit) return URL.createObjectURL(await hit.blob())
  } catch {}
  return url
}

export async function getCachedCount(): Promise<number> {
  if (typeof caches === 'undefined') return 0
  try {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.keys()).length
  } catch { return 0 }
}

export async function clearAudioCache(): Promise<void> {
  if (typeof caches === 'undefined') return
  try { await caches.delete(CACHE_NAME) } catch {}
}