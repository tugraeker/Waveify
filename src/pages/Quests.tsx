import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import { getDailyQuests, getWeeklyQuests, claimQuest, getStats, getXpTotal, type Quest } from '@/lib/achievements'
import { computeLevel } from '@/types'
import { Sprout, TreeDeciduous, CheckCircle2, Gift, Lock, Hourglass, Flame, Award } from 'lucide-react'

/* 183 — Görev Ağacı: günlük ve haftalık görevleri dallar halinde büyüt */
export function QuestTree() {
  const [daily, setDaily] = useState<Quest[]>([])
  const [weekly, setWeekly] = useState<Quest[]>([])
  const [xp, setXp] = useState(0)
  const [, force] = useState(0)

  useEffect(() => {
    setDaily(getDailyQuests())
    setWeekly(getWeeklyQuests())
    setXp(getXpTotal())
  }, [])

  function refresh() {
    setDaily(getDailyQuests())
    setWeekly(getWeeklyQuests())
    setXp(getXpTotal())
    force((n) => n + 1)
  }

  function handleClaim(q: Quest) {
    if (claimQuest(q.id)) { emitToast(`🎁 ${q.reward} XP kazandın!`, 'success'); refresh() }
  }

  const renderBranch = (quests: Quest[]) => (
    <div className="flex flex-col gap-2">
      {quests.map((q) => {
        const pct = Math.min(100, Math.round((q.progress / q.target) * 100))
        return (
          <div key={q.id} className={`rounded-xl p-3 border transition-all ${q.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-surface-700 bg-surface-900/40'}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${q.completed ? 'text-emerald-300' : 'text-surface-200'}`}>
                <Sprout size={12} className={q.completed ? 'text-emerald-400' : 'text-surface-500'} />
                {q.label}
              </span>
              <span className="text-[10px] text-surface-500 flex items-center gap-1"><Flame size={10} className="text-amber-400" /> {q.reward} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${q.completed ? 'bg-emerald-400' : 'bg-wave-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-surface-500">{q.progress}/{q.target}</span>
              {q.completed ? (
                q.claimed ? (
                  <span className="text-[10px] text-surface-500 flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-400" /> Toplandı</span>
                ) : (
                  <button onClick={() => handleClaim(q)} className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                    <Gift size={10} /> Topla
                  </button>
                )
              ) : (
                <span className="text-[10px] text-surface-600 flex items-center gap-1"><Lock size={10} /> Devam ediyor</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="glass rounded-2xl p-5 border border-emerald-500/15">
      <div className="flex items-center gap-2 mb-1">
        <TreeDeciduous size={16} className="text-emerald-400" />
        <p className="text-sm font-bold text-white">Görev Ağacı</p>
        <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-0.5">{xp} XP</span>
      </div>
      <p className="text-[11px] text-surface-500 mb-4">Görevleri tamamla, dallar büyüsün, XP kazan</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-2">Günlük</p>
      {renderBranch(daily)}
      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80 mb-2 mt-4">Haftalık</p>
      {renderBranch(weekly)}
    </div>
  )
}

/* 193 — Zaman Kapsülü: bugünü şarkıyla göm, gelecekte aç */
const CAPSULE_KEY = 'waveify_capsule'

interface Capsule { message: string; songTitle: string; songArtist: string; createdAt: string; openAt: string }

export function TimeCapsule() {
  const { songs } = useStore()
  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [message, setMessage] = useState('')
  const [days, setDays] = useState(7)
  const [songId, setSongId] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CAPSULE_KEY)
      if (raw) setCapsule(JSON.parse(raw))
    } catch {}
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  function bury() {
    if (!message.trim() || !songId) { emitToast('Mesaj ve şarkı seç', 'info'); return }
    const song = songs.find((s) => s.id === songId)
    const next: Capsule = {
      message: message.trim(),
      songTitle: song?.title || 'Bilinmeyen',
      songArtist: song?.artist || '',
      createdAt: new Date().toISOString(),
      openAt: new Date(Date.now() + days * 86400000).toISOString(),
    }
    localStorage.setItem(CAPSULE_KEY, JSON.stringify(next))
    setCapsule(next)
    setMessage('')
    emitToast('🕰️ Kapsül gömüldü!', 'success')
  }

  function openCapsule() {
    if (!capsule || now < new Date(capsule.openAt).getTime()) return
    setCapsule(null)
    localStorage.removeItem(CAPSULE_KEY)
    emitToast('🗝️ Kapsül açıldı! Geçmişten gelen mesaj...', 'success')
  }

  const locked = capsule ? now < new Date(capsule.openAt).getTime() : false
  const remainMs = capsule ? new Date(capsule.openAt).getTime() - now : 0
  const remainD = Math.floor(remainMs / 86400000)
  const remainH = Math.floor((remainMs % 86400000) / 3600000)

  return (
    <div className="glass rounded-2xl p-5 border border-amber-500/15">
      <div className="flex items-center gap-2 mb-1">
        <Hourglass size={15} className="text-amber-400" />
        <p className="text-sm font-bold text-white">Zaman Kapsülü</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-4">Bugünü bir şarkıyla göm; gelecekteki sana açılsın</p>
      {capsule ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            {locked ? <Lock size={24} className="text-amber-400" /> : <Gift size={24} className="text-emerald-400" />}
          </div>
          <p className="text-xs font-semibold text-surface-200 mt-3">{locked ? `Kapsül kilitli — ${remainD} gün ${remainH} saat kaldı` : 'Kapsül açılmayı bekliyor!'}</p>
          <p className="text-[11px] text-surface-500 mt-1">"{capsule.message.slice(0, 60)}{capsule.message.length > 60 ? '...' : ''}"</p>
          <p className="text-[10px] text-surface-600 mt-1">🎵 {capsule.songTitle} — {capsule.songArtist}</p>
          {!locked && <button onClick={openCapsule} className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-surface-950 text-xs font-bold hover:opacity-90 transition-opacity">🗝️ Kapsülü Aç</button>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gelecekteki sana mesaj..." className="bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-amber-500/50 resize-none h-16" />
          <select value={songId} onChange={(e) => setSongId(e.target.value)} className="h-9 rounded-xl bg-surface-900 border border-surface-700 px-2 text-xs text-white outline-none">
            <option value="">Şarkı seç...</option>
            {songs.slice(0, 50).map((s) => <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500">Açılış:</span>
            {[7, 30, 180].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${days === d ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'border-surface-700 text-surface-400 hover:text-white'}`}>
                {d} gün
              </button>
            ))}
          </div>
          <button onClick={bury} className="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-surface-950 text-xs font-bold hover:opacity-90 transition-opacity">🕰️ Göm</button>
        </div>
      )}
    </div>
  )
}

/* 198 — Ünvanlar: XP'ye göre müzik unvanları */
const TITLES = [
  { min: 0, title: 'Acemi Dinleyici', icon: '🎧', color: 'from-surface-600 to-surface-700' },
  { min: 200, title: 'Melodi Avcısı', icon: '🎶', color: 'from-sky-600 to-cyan-600' },
  { min: 500, title: 'Ritim Dostu', icon: '🥁', color: 'from-emerald-600 to-teal-600' },
  { min: 1000, title: 'Aranje Ustası', icon: '🎼', color: 'from-amber-600 to-orange-600' },
  { min: 2000, title: 'Kadans Yıldızı', icon: '✨', color: 'from-violet-600 to-purple-600' },
  { min: 4000, title: 'Efsane Kulak', icon: '👑', color: 'from-rose-600 to-pink-600' },
]

export function Titles() {
  const [xp, setXp] = useState(0)
  useEffect(() => {
    const update = () => setXp(getXpTotal())
    update()
    const iv = setInterval(update, 3000)
    return () => clearInterval(iv)
  }, [])

  const level = computeLevel(xp)
  const current = TITLES.filter((t) => xp >= t.min).pop()

  return (
    <div className="glass rounded-2xl p-5 border border-violet-500/15">
      <div className="flex items-center gap-2 mb-1">
        <Award size={15} className="text-violet-400" />
        <p className="text-sm font-bold text-white">Ünvanlar</p>
      </div>
      <p className="text-[11px] text-surface-500 mb-4">Seviye: {level.level} · Toplam {xp} XP</p>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current?.color || 'from-surface-600 to-surface-700'} flex items-center justify-center text-2xl shadow-lg mb-3`}>
        {current?.icon}
      </div>
      <p className="text-sm font-bold text-white">{current?.title || 'Acemi Dinleyici'}</p>
      <div className="flex flex-col gap-1.5 mt-4">
        {TITLES.map((t) => {
          const earned = xp >= t.min
          const isNext = !earned && !TITLES.filter((x) => x.min > t.min).some((x) => xp >= x.min)
          return (
            <div key={t.title} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${earned ? 'border-violet-500/30 bg-violet-500/5' : isNext ? 'border-amber-500/40 bg-amber-500/5' : 'border-surface-800 bg-surface-900/30 opacity-50'}`}>
              <span className="text-base">{t.icon}</span>
              <div className="flex-1">
                <p className={`text-[11px] font-semibold ${earned ? 'text-violet-300' : 'text-surface-300'}`}>{t.title}</p>
                <p className="text-[9px] text-surface-500">{t.min} XP</p>
              </div>
              {earned && <CheckCircle2 size={13} className="text-emerald-400" />}
              {isNext && <span className="text-[9px] font-bold text-amber-300">SIRADA</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
