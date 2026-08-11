import { supabase } from '@/lib/supabase'

export async function writeLike(userId: string, songId: string, liked: boolean): Promise<boolean> {
  const q = liked
    ? supabase.from('likes').delete().eq('user_id', userId).eq('song_id', songId)
    : supabase.from('likes').insert({ user_id: userId, song_id: songId })
  const { error } = await q
  return !error
}

export async function bumpLikeCount(songId: string, current: number | null | undefined, delta: 1 | -1) {
  await supabase.from('songs').update({ likes_count: Math.max(0, (current || 0) + delta) }).eq('id', songId)
}
