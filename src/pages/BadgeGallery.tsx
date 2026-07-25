import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/store/store'
import { BADGE_DEFS, computeLevel } from '@/types'
import { getStats, getXpTotal, getDailyQuests, getWeeklyQuests, claimQuest, getMonthlyReport, isXpBonusDay } from '@/lib/achievements'
import { supabase } from '@/lib/supabase'
import { Award, Medal, Star, Shield, Lock, Trophy, Sparkles, Music, Heart, Upload, ListMusic, Globe, Users, MessageSquare, Headphones, Zap, Check, Gift, TrendingUp, Calendar, X } from 'lucide-react'
import type { Quest } from '@/lib/achievements'
import type { LooseBadgeDef } from '@/types'

const categoryIcons: Record<string, any> = { admin: Shield, achievement: Zap }

const categoryLabels: Record<string, string> = { admin: 'Yönetici Rozetleri', achievement: 'Başarı Rozetleri' }

function badgeIcon(def: LooseBadgeDef) {
  const map: Record<string, any> = {
    streak: Zap, headphones: Headphones, heart: Heart, upload: Upload,
    playlist: ListMusic, import: Globe, friends: Users, chat: MessageSquare,
    star: Star, verified: Award, artist: Medal, dj: Music,
    mod: Shield, vip: Trophy, early: Sparkles, contributor: Award,
    beta: Shield, hall: Trophy, ambassador: Award, legend: Medal,
    supporter: Heart, producer: Music,
  }
  return map[def.icon] || Award
}

export default function BadgeGallery() {
  const { badges, user } = useStore()
  const [tab, setTab] = useState<'all' | 'admin' | 'achievement'>('all')
  const [section, setSection] = useState<'badges' | 'quests' | 'leaderboard' | 'report'>('badges')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [friendLeaderboard, setFriendLeaderboard] = useState<any[]>([])

  const stats = getStats()
  const xpTotal = getXpTotal()
  const levelInfo = computeLevel(xpTotal)
  const dailyQuests = getDailyQuests()
  const weeklyQuests = getWeeklyQuests()
  const monthlyReport = getMonthlyReport()
  const xpBonus = isXpBonusDay()

  useEffect(() => {
    fetchLeaderboard()
    if (user) fetchFriendLeaderboard()
  }, [user])

  async function fetchLeaderboard() {
    const { data } = await supabase.from('users').select('id, username, avatar_url').limit(100)
    if (!data) return
    const withXp = data.map(u => ({
      ...u,
      xp: Number(localStorage.getItem(`waveify_xp_${u.id}`)) || 0,
      level: computeLevel(Number(localStorage.getItem(`waveify_xp_${u.id}`)) || 0).level,
    })).sort((a, b) => b.xp - a.xp).slice(0, 50)
    setLeaderboard(withXp)
  }

  async function fetchFriendLeaderboard() {
    if (!user) return
    const { data: friendIds } = await supabase.from('friends').select('friend_id').eq('user_id', user.id).eq('status', 'accepted')
    const ids = friendIds?.map((f: any) => f.friend_id) || []
    ids.push(user.id)
    const { data: friends } = await supabase.from('users').select('id, username, avatar_url').in('id', ids)
    if (!friends) return
    const withXp = friends.map(u => ({
      ...u,
      xp: Number(localStorage.getItem(`waveify_xp_${u.id}`)) || 0,
      level: computeLevel(Number(localStorage.getItem(`waveify_xp_${u.id}`)) || 0).level,
    })).sort((a, b) => b.xp - a.xp)
    setFriendLeaderboard(withXp)
  }

  const owned = useMemo(() => new Set(badges.map(b => b.badge_type)), [badges])

  const progressMap: Record<string, { current: number; needed: number }> = {
    streak_7: { current: stats.daysActive, needed: 7 },
    streak_30: { current: stats.daysActive, needed: 30 },
    streak_100: { current: stats.daysActive, needed: 100 },
    streak_365: { current: stats.daysActive, needed: 365 },
    listener_100: { current: stats.songsListened, needed: 100 },
    listener_1000: { current: stats.songsListened, needed: 1000 },
    listener_5000: { current: stats.songsListened, needed: 5000 },
    listener_10000: { current: stats.songsListened, needed: 10000 },
    liker_50: { current: stats.likesGiven, needed: 50 },
    liker_200: { current: stats.likesGiven, needed: 200 },
    liker_500: { current: stats.likesGiven, needed: 500 },
    upload_1: { current: stats.songsUploaded, needed: 1 },
    upload_10: { current: stats.songsUploaded, needed: 10 },
    upload_50: { current: stats.songsUploaded, needed: 50 },
    playlist_3: { current: stats.playlistsCreated, needed: 3 },
    playlist_10: { current: stats.playlistsCreated, needed: 10 },
    import_5: { current: stats.importsDone, needed: 5 },
    import_25: { current: stats.importsDone, needed: 25 },
    friend_5: { current: stats.friendsAdded, needed: 5 },
    friend_20: { current: stats.friendsAdded, needed: 20 },
    chat_100: { current: stats.chatMessages, needed: 100 },
    popular_10: { current: stats.totalLikesOnSongs, needed: 10 },
    popular_100: { current: stats.totalLikesOnSongs, needed: 100 },
    level_5: { current: xpTotal, needed: 500 },
    level_10: { current: xpTotal, needed: 2000 },
    level_25: { current: xpTotal, needed: 10000 },
  }

  const filtered = BADGE_DEFS.filter(b => tab === 'all' || b.category === tab)

  function renderQuestList(quests: Quest[], title: string) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-3">{title}</h3>
        <div className="space-y-2">
          {quests.map(q => (
            <div key={q.id} className="bg-surface-900/50 border border-surface-800/50 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${q.completed ? 'bg-green-500/20 text-green-400' : 'bg-surface-800 text-surface-500'}`}>
                {q.claimed ? <Check size={16} /> : <Zap size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{q.label}</p>
                <div className="h-1.5 rounded-full bg-surface-800 mt-1 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${q.completed ? 'bg-green-500' : 'bg-wave-500'}`} style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-surface-500 mt-0.5">{q.progress}/{q.target} — {q.reward} XP</p>
              </div>
              {q.completed && !q.claimed ? (
                <button onClick={() => { claimQuest(q.id); window.location.reload() }} className="px-3 py-1.5 rounded-lg bg-wave-500 text-white text-xs font-medium hover:bg-wave-400 transition-colors">
                  Topla
                </button>
              ) : q.claimed ? (
                <span className="text-xs text-green-400">Alındı</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Trophy size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rozet Galerisi</h1>
            <p className="text-sm text-surface-400">{badges.length} / {BADGE_DEFS.length} rozet kazanıldı</p>
          </div>
        </div>

        {/* XP Bonus indicator */}
        {xpBonus && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium flex items-center gap-2">
            <Sparkles size={16} /> Hafta Sonu XP Bonus! Tüm XP kazançları 2 katı!
          </div>
        )}

        {/* Level card */}
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-surface-400 font-medium">Seviye {levelInfo.level}</span>
            <span className="text-xs text-surface-500">{xpTotal} XP</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-wave-500 to-purple-500 transition-all" style={{ width: `${Math.min(100, (levelInfo.xp / levelInfo.nextLevelXp) * 100)}%` }} />
          </div>
          <p className="text-xs text-surface-500 mt-1.5">{levelInfo.xp} / {levelInfo.nextLevelXp} XP — Seviye {levelInfo.level + 1}</p>
        </div>

        {/* Section nav */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: 'badges', label: 'Rozetler', icon: Award },
            { key: 'quests', label: 'Görevler', icon: Gift },
            { key: 'leaderboard', label: 'Liderlik', icon: TrendingUp },
            { key: 'report', label: 'Rapor', icon: Calendar },
          ] as const).map(s => {
            const Icon = s.icon
            return (
              <button key={s.key} onClick={() => setSection(s.key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${section === s.key ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
                <Icon size={14} /> {s.label}
              </button>
            )
          })}
        </div>

        {section === 'badges' && (
          <>
            <div className="flex gap-2 mb-6">
              {(['all', 'achievement', 'admin'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
                  {t === 'all' ? 'Tümü' : categoryLabels[t]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map(def => {
                const isOwned = owned.has(def.type)
                const Icon = badgeIcon(def)
                const progress = progressMap[def.type]
                const pct = progress ? Math.min(100, Math.round((progress.current / progress.needed) * 100)) : 0
                return (
                  <div key={def.type}
                    className={`rounded-2xl p-4 border transition-all ${isOwned ? 'bg-surface-900/60 border-surface-700/50' : 'bg-surface-900/30 border-surface-800/30 opacity-60'}`}>
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOwned ? 'shadow-lg' : ''}`}
                        style={isOwned ? { backgroundColor: def.color + '20', color: def.color } : { backgroundColor: '#1a1a2e20', color: '#555' }}>
                        {isOwned ? <Icon size={22} /> : <Lock size={16} />}
                      </div>
                      <p className={`text-xs font-semibold leading-tight ${isOwned ? 'text-white' : 'text-surface-500'}`}>{def.label}</p>
                      <p className="text-[10px] text-surface-500 leading-tight">{def.desc}</p>
                      {!isOwned && progress && (
                        <div className="w-full mt-1">
                          <div className="h-1 rounded-full bg-surface-800 overflow-hidden">
                            <div className="h-full rounded-full bg-surface-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[9px] text-surface-600 mt-0.5">{progress.current}/{progress.needed}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {section === 'quests' && (
          <div>
            {renderQuestList(dailyQuests, 'Günlük Görevler')}
            {renderQuestList(weeklyQuests, 'Haftalık Görevler')}
          </div>
        )}

        {section === 'leaderboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3">🌍 Global Liderlik</h3>
              <div className="space-y-1">
                {leaderboard.slice(0, 20).map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-surface-500'}`}>#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">{u.username?.[0]?.toUpperCase() || '?'}</div>
                    <span className="flex-1 text-sm text-white truncate">{u.username}</span>
                    <span className="text-xs text-surface-400">Seviye {u.level}</span>
                    <span className="text-xs text-wave-400">{u.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3">👥 Arkadaş Liderliği</h3>
              <div className="space-y-1">
                {friendLeaderboard.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${u.id === user?.id ? 'bg-wave-500/5 border border-wave-500/20' : 'hover:bg-white/5'}`}>
                    <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-surface-500'}`}>#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">{u.username?.[0]?.toUpperCase() || '?'}</div>
                    <span className="flex-1 text-sm text-white truncate">{u.username}{u.id === user?.id ? ' (sen)' : ''}</span>
                    <span className="text-xs text-surface-400">Seviye {u.level}</span>
                    <span className="text-xs text-wave-400">{u.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'report' && (
          <div className="glass rounded-2xl p-6 border border-surface-800/50">
            <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-wave-400" /> Aylık Rapor — {monthlyReport.month}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Dinlenen Şarkı', value: monthlyReport.songsListened, icon: Headphones },
                { label: 'Beğeni', value: monthlyReport.likesGiven, icon: Heart },
                { label: 'Yüklenen', value: monthlyReport.songsUploaded, icon: Upload },
                { label: 'İçe Aktarma', value: monthlyReport.importsDone, icon: Globe },
                { label: 'Arkadaş', value: monthlyReport.friendsAdded, icon: Users },
                { label: 'Mesaj', value: monthlyReport.chatMessages, icon: MessageSquare },
                { label: 'Aktif Gün', value: monthlyReport.daysActive, icon: Calendar },
                { label: 'Toplam XP', value: monthlyReport.totalXp, icon: Zap },
                { label: 'Seviye', value: levelInfo.level, icon: Trophy },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="bg-surface-900/50 rounded-xl p-4 text-center border border-surface-800/30">
                    <Icon size={20} className="mx-auto mb-2 text-wave-400" />
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                    <p className="text-xs text-surface-400 mt-1">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
