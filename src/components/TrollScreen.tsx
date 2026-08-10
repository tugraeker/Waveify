import { useEffect } from 'react'
import { clearLocalTrolls, sendTroll, trollToneColors, type TrollMessage } from '@/lib/troll'
import { useStore } from '@/store/store'
import { X, Send } from 'lucide-react'

export default function TrollScreen({ message, onClose }: { message: TrollMessage; onClose: () => void }) {
  const user = useStore((s) => s.user)
  useEffect(() => {
    try { if (typeof navigator.vibrate === 'function') navigator.vibrate([300, 100, 300]) } catch {}
  }, [])

  const c = trollToneColors(message.tone)

  function reply() {
    const t = { emoji: '💀', text: 'GEL BURAYA, BEN DE SENİN EKRANINA YAZARIM 😈', tone: 'red' as const }
    if (user) sendTroll(user.id, t.emoji, t.text, t.tone, 'Kurban')
    onClose()
  }

  return (
    <div className={`fixed inset-0 z-[400] flex items-center justify-center animate-siren ${c.bg}`} onClick={onClose}>
      <div className="w-full max-w-lg mx-6 text-center px-6 py-14 rounded-3xl glass-strong border-4 animate-screen-shake select-none" onClick={(e) => e.stopPropagation()}>
        <div className="text-7xl mb-8 animate-float">{message.emoji}</div>
        <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase tracking-tight text-white text-glow-red leading-tight mb-6 neon-screen">
          {message.text}
        </h2>
        <p className={`text-sm font-display uppercase tracking-[0.25em] mb-10 ${c.text}`}>
          — {message.from || 'Bilinmeyen Arkadaş'} tarafından gönderildi
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reply}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors"
          >
            <Send size={14} /> Cevap Ver
          </button>
          <button
            onClick={() => { clearLocalTrolls(); onClose() }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-black/30 hover:bg-black/50 border border-white/10 text-surface-200 text-sm font-semibold transition-colors"
          >
            <X size={14} /> Kapat
          </button>
        </div>
      </div>
    </div>
  )
}