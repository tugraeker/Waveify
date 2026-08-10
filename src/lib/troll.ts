import { supabase } from '@/lib/supabase'

export interface TrollMessage {
  id: string
  emoji: string
  text: string
  from: string
  ts: number
  tone: 'red' | 'amber' | 'cyan' | 'lime' | 'purple' | 'pink'
}

export const TROLL_TEMPLATES: { emoji: string; text: string; tone: TrollMessage['tone'] }[] = [
  { emoji: '🚨', text: 'TELEFONUN ÇALINIYOR! HEMEN KAPAT!', tone: 'red' },
  { emoji: '📵', text: 'SİL O ŞARKIYI — KULAKLARIN ÖLÜYOR', tone: 'amber' },
  { emoji: '🌡️', text: 'TELEFONUN AŞIRI ISINIYOR! BUZLUĞA KOY!', tone: 'cyan' },
  { emoji: '🔋', text: 'ŞARJIN %3 — SARI KABLONU BUL, HIZLI!', tone: 'lime' },
  { emoji: '👀', text: 'GÖZÜNÜ ALDIM. ARKANA BAKMA.', tone: 'purple' },
  { emoji: '📢', text: 'DİNLEDİĞİN O ŞARKIDAN UTAN. HERKES GÖRDÜ.', tone: 'pink' },
]

const INBOX_KEY = 'waveify_troll_inbox'

const TONE_COLORS: Record<TrollMessage['tone'], { ring: string; text: string; bg: string }> = {
  red: { ring: 'border-red-500', text: 'text-red-400', bg: 'bg-red-950' },
  amber: { ring: 'border-amber-500', text: 'text-amber-300', bg: 'bg-amber-950' },
  cyan: { ring: 'border-cyan-500', text: 'text-cyan-300', bg: 'bg-cyan-950' },
  lime: { ring: 'border-lime-500', text: 'text-lime-300', bg: 'bg-lime-950' },
  purple: { ring: 'border-purple-500', text: 'text-purple-300', bg: 'bg-purple-950' },
  pink: { ring: 'border-pink-500', text: 'text-pink-300', bg: 'bg-pink-950' },
}

export function trollToneColors(tone: TrollMessage['tone']) {
  return TONE_COLORS[tone] || TONE_COLORS.red
}

export function pushLocalTroll(msg: TrollMessage) {
  try {
    const inbox: TrollMessage[] = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]')
    if (inbox.some((m) => m.id === msg.id)) return
    inbox.push(msg)
    localStorage.setItem(INBOX_KEY, JSON.stringify(inbox.slice(-5)))
  } catch {}
}

export function popLocalTroll(): TrollMessage | null {
  try {
    const inbox: TrollMessage[] = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]')
    if (inbox.length === 0) return null
    const [first, ...rest] = inbox
    localStorage.setItem(INBOX_KEY, JSON.stringify(rest))
    return first
  } catch { return null }
}

export function clearLocalTrolls() {
  localStorage.removeItem(INBOX_KEY)
}

export function sendTroll(targetUserId: string, emoji: string, text: string, tone: TrollMessage['tone'], from: string) {
  const msg: TrollMessage = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, emoji, text, from, ts: Date.now(), tone }
  pushLocalTroll(msg)
  supabase
    .from('users')
    .select('display_settings')
    .eq('id', targetUserId)
    .single()
    .then(({ data }) => {
      if (!data) return
      const settings: any = data.display_settings || {}
      const queue: TrollMessage[] = Array.isArray(settings.trollInbox) ? settings.trollInbox : []
      queue.push(msg)
      supabase.from('users').update({ display_settings: { ...settings, trollInbox: queue.slice(-5) } }).eq('id', targetUserId)
        .then(({ error }) => { if (error) pushLocalTroll(msg) }, () => {})
    }, () => {})
}