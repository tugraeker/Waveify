import { useState, useMemo } from 'react'
import { useStore } from '@/store/store'
import { BADGE_DEFS, computeLevel } from '@/types'
import { getStats, getXpTotal } from '@/lib/achievements'
import { Award, Medal, Star, Shield, Lock, ChevronRight, Trophy, Sparkles, Music, Heart, Upload, ListMusic, Globe, Users, MessageSquare, Headphones, Zap } from 'lucide-react'
import type { LooseBadgeDef } from '@/types'

const categoryIcons: Record<string, any> = {
  admin: Shield,
  achievement: Zap,
}

const categoryLabels: Record<string, string> = {
  admin: 'Yönetici Rozetleri',
  achievement: 'Başarı Rozetleri',
}

function badgeIcon(def: LooseBadgeDef) {
  const map: Record<string, any> = {
    streak: Zap, headphones: Headphones, heart: Heart, upload: Upload,
    playlist: ListMusic, import: Globe, friends: Users, chat: MessageSquare,
    star: Star, verified: Award, artist: Medal, dj: Music,
    mod: Shield, vip: Trophy, early: Sparkles, contributor: Award,
    beta: Shield, hall: Trophy, ambassador: Award, legend: Medal,
    supporter: Heart,
  }
  return map[def.icon] || Award
}

export default function BadgeGallery() {
  const { badges, user } = useStore()
  const [tab, setTab] = useState<'all' | 'admin' | 'achievement'>('all')

  const stats = getStats()
  const xpTotal = getXpTotal()
  const levelInfo = computeLevel(xpTotal)

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

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header with level */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Trophy size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rozet Galerisi</h1>
            <p className="text-sm text-surface-400">{badges.length} / {BADGE_DEFS.length} rozet kazanıldı</p>
          </div>
        </div>

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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'achievement', 'admin'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20' : 'text-surface-400 hover:text-white border border-transparent'}`}>
              {t === 'all' ? 'Tümü' : categoryLabels[t]}
            </button>
          ))}
        </div>

        {/* Badge grid */}
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
                  <p className={`text-xs font-semibold leading-tight ${isOwned ? 'text-white' : 'text-surface-500'}`}>
                    {def.label}
                  </p>
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
      </div>
    </div>
  )
}