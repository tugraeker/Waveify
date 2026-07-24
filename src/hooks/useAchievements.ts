import { useEffect, useCallback } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { getStats } from '@/lib/achievements'

export function useAchievementsInit() {
  const { user, badges, setBadges } = useStore()

  const loadBadges = useCallback(() => {
    if (!user) return
    supabase.from('badges').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) setBadges(data as any)
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    loadBadges()
  }, [user?.id])

  async function checkAndAward(type: string, label: string, color: string) {
    if (!user || badges.some(b => b.badge_type === type)) return
    const { error } = await supabase.from('badges').insert({
      user_id: user.id,
      badge_type: type,
      label,
      color,
    })
    if (!error) loadBadges()
  }

  useEffect(() => {
    if (!user) return
    const s = getStats()
    if (s.daysActive >= 7) checkAndAward('streak_7', '7 Günlük Seri', '#22c7c0')
    if (s.daysActive >= 30) checkAndAward('streak_30', '30 Günlük Seri', '#f59e0b')
    if (s.songsListened >= 100) checkAndAward('listener_100', '100 Şarkı', '#8b5cf6')
    if (s.songsListened >= 1000) checkAndAward('listener_1000', '1.000 Şarkı', '#ec4899')
    if (s.likesGiven >= 50) checkAndAward('liker_50', '50 Beğeni', '#ef4444')
    if (s.likesGiven >= 200) checkAndAward('liker_200', '200 Beğeni', '#ef4444')
  }, [user?.id])
}