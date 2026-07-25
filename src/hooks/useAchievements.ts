import { useEffect, useCallback, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { getStats, getXpTotal, awardXp, isXpBonusDay, getHolidayBadges, getDailyQuests, getWeeklyQuests } from '@/lib/achievements'
import { emitToast } from '@/hooks/useToast'
import { computeLevel } from '@/types'

export function useAchievementsInit() {
  const { user, badges, setBadges } = useStore()
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [newLevel, setNewLevel] = useState(0)

  const loadBadges = useCallback(() => {
    if (!user) return
    supabase.from('badges').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) setBadges(data as any)
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    loadBadges()
    // Daily visit XP
    const lastVisit = localStorage.getItem('waveify_last_visit_date')
    const today = new Date().toDateString()
    if (lastVisit !== today) {
      const xpAmount = isXpBonusDay() ? 6 : 3
      const prevLevel = computeLevel(getXpTotal()).level
      awardXp(xpAmount)
      const newLevelInfo = computeLevel(getXpTotal())
      if (newLevelInfo.level > prevLevel) {
        setNewLevel(newLevelInfo.level)
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 4000)
      }
      localStorage.setItem('waveify_last_visit_date', today)
    }
  }, [user?.id])

  async function checkAndAward(type: string, label: string, color: string) {
    if (!user || badges.some(b => b.badge_type === type)) return
    const prevLevel = computeLevel(getXpTotal()).level
    const { error } = await supabase.from('badges').insert({
      user_id: user.id,
      badge_type: type,
      label,
      color,
    })
    if (!error) {
      loadBadges()
      emitToast(`🏆 ${label} rozetini kazandın!`, 'success')
    }
  }

  // Holiday badge check
  useEffect(() => {
    if (!user) return
    const holidayBadges = getHolidayBadges()
    holidayBadges.forEach(hb => checkAndAward(hb.type, hb.label, hb.color))
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const s = getStats()
    // Streak
    if (s.daysActive >= 7) checkAndAward('streak_7', '7 Günlük Seri', '#22c7c0')
    if (s.daysActive >= 30) checkAndAward('streak_30', '30 Günlük Seri', '#f59e0b')
    if (s.daysActive >= 100) checkAndAward('streak_100', '100 Gün Seri', '#ec4899')
    if (s.daysActive >= 365) checkAndAward('streak_365', 'Bir Yıllık Seri', '#8b5cf6')
    // Listener
    if (s.songsListened >= 100) checkAndAward('listener_100', '100 Şarkı', '#8b5cf6')
    if (s.songsListened >= 1000) checkAndAward('listener_1000', '1.000 Şarkı', '#ec4899')
    if (s.songsListened >= 5000) checkAndAward('listener_5000', '5.000 Şarkı (Audiophile)', '#f59e0b')
    if (s.songsListened >= 10000) checkAndAward('listener_10000', '10.000 Şarkı (Efsane)', '#22c7c0')
    // Liker
    if (s.likesGiven >= 50) checkAndAward('liker_50', '50 Beğeni', '#ef4444')
    if (s.likesGiven >= 200) checkAndAward('liker_200', '200 Beğeni', '#ef4444')
    if (s.likesGiven >= 500) checkAndAward('liker_500', '500 Beğeni (Koleksiyoncu)', '#ec4899')
    // Uploader
    if (s.songsUploaded >= 1) checkAndAward('upload_1', 'İlk Yükleme', '#10b981')
    if (s.songsUploaded >= 10) checkAndAward('upload_10', 'Yükleyici', '#22c7c0')
    if (s.songsUploaded >= 50) checkAndAward('upload_50', 'Kütüphane', '#3b82f6')
    // Playlist
    if (s.playlistsCreated >= 3) checkAndAward('playlist_3', 'Küratör', '#f97316')
    if (s.playlistsCreated >= 10) checkAndAward('playlist_10', 'Usta Küratör', '#8b5cf6')
    // Import
    if (s.importsDone >= 5) checkAndAward('import_5', 'İçe Aktarıcı', '#06b6d4')
    if (s.importsDone >= 25) checkAndAward('import_25', 'Arşivci', '#6366f1')
    // Friend
    if (s.friendsAdded >= 5) checkAndAward('friend_5', 'Sosyal', '#f43f5e')
    if (s.friendsAdded >= 20) checkAndAward('friend_20', 'Popüler', '#ec4899')
    // Chat
    if (s.chatMessages >= 100) checkAndAward('chat_100', 'Konuşkan', '#22c7c0')
    // Popularity
    if (s.totalLikesOnSongs >= 10) checkAndAward('popular_10', 'Yükselen Yıldız', '#f59e0b')
    if (s.totalLikesOnSongs >= 100) checkAndAward('popular_100', 'Vitrin Sanatçısı', '#8b5cf6')
    // Level badges
    const xp = getXpTotal()
    if (xp >= 500) checkAndAward('level_5', 'Seviye 5', '#10b981')
    if (xp >= 2000) checkAndAward('level_10', 'Seviye 10', '#22c7c0')
    if (xp >= 10000) checkAndAward('level_25', 'Seviye 25', '#8b5cf6')
  }, [user?.id])

  return { showLevelUp, newLevel }
}
