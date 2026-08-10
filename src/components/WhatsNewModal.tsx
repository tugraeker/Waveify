import { useState } from 'react'
import { Sparkles, X, Palette, Mic2, AudioWaveform, Headphones, Star, Flag, Type } from 'lucide-react'

const VERSION = '6.0.0'
const STORAGE_KEY = 'waveify_seen_whatsnew'

const FEATURES = [
  { icon: Palette, title: 'Yeni Tasarım Sistemi', desc: 'Mor-amber palet, Space Grotesk tipografi, premium derinlik ve yeni ambient glow. Tamamen yeniden cilalandı.' },
  { icon: Mic2, title: 'Karaoke Modu', desc: 'Gerçek zamanlı vokal kaldırma (mid-side işleme). Şarkıyı enstrümantal yap ya da tersine sadece vokali izole et.' },
  { icon: Headphones, title: 'Drop Modu', desc: '3 saniyelik kesitle şarkı tahmin oyunu. Doğru tahmin serisi yaklaştıkça puan artar, XP kazanırsın.' },
  { icon: AudioWaveform, title: 'Lo-Fi Beat Üreteci', desc: 'Ses manzaralarına sonsuz üretilen lo-fi ritim eklendi — kick, hat, bas ve vinil çıtırtısı anında senin için çalınıyor.' },
  { icon: Star, title: 'Yıldız Haritası', desc: 'Her frekans bandı bir yıldıza dönüşüyor: şarkının enerjisine göre değişen mini müzik galaksisi visualizer.' },
  { icon: Flag, title: 'Tam Dinleme Serisi', desc: 'Şarkıyı sonuna kadar dinleme görevi — parçayı bitirenlere günlük görev ve XP.' },
  { icon: Type, title: 'Premium Tipografi', desc: 'Tüm sayfa başlıkları ferah Space Grotesk ile yeniden dizildi.' },
]

export default function WhatsNewModal() {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== VERSION)

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, VERSION)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={dismiss}>
      <div className="glass rounded-3xl border border-surface-800/60 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-surface-800/40 bg-gradient-to-r from-wave-500/15 via-fuchsia-500/10 to-amber-400/10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-wave-400 via-fuchsia-500 to-amber-400 flex items-center justify-center shadow-lg shadow-wave-500/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-white">Waveify {VERSION}</h2>
            <p className="text-xs text-surface-400">Tasarım yenilendi + devasa özellik seti</p>
          </div>
          <button onClick={dismiss} className="text-surface-400 hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto scrollbar-thin grid grid-cols-1 gap-2.5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="flex gap-3 items-start p-3 rounded-2xl bg-surface-800/30 border border-surface-800/40 hover:border-wave-500/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-wave-500/10 border border-wave-500/25 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-wave-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-surface-800/40">
          <button onClick={dismiss} className="w-full py-3 rounded-2xl bg-gradient-to-r from-wave-500 via-fuchsia-500 to-amber-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-wave-500/20">
            Keşfetmeye Başla
          </button>
        </div>
      </div>
    </div>
  )
}