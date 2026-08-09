import { supabase } from '@/lib/supabase'
import type { Song } from '@/types'

export async function fetchRadioBatch(seed: Song, excludeIds: string[], limit = 20): Promise<Song[]> {
  const excluded = [...new Set(excludeIds)]
  let query = supabase.from('songs').select('*').order('likes_count', { ascending: false }).limit(500)
  const { data } = await query
  let pool: Song[] = (data as Song[]) || []

  if (seed.genre) {
    const byGenre = pool.filter((s) => s.genre && s.genre.toLowerCase() === seed.genre!.toLowerCase() && !excluded.includes(s.id))
    if (byGenre.length > 0) pool = byGenre
  }
  if (seed.bpm) {
    const byBpm = pool.filter((s) => s.bpm && Math.abs(s.bpm - seed.bpm!) <= 8 && !excluded.includes(s.id))
    if (byBpm.length >= 5) pool = byBpm
  }
  const usable = pool.filter((s) => !excluded.includes(s.id))
  const shuffled = [...usable].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}