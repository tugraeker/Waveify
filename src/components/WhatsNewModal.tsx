import { useState } from 'react'
import { Sparkles, X, Radio, Zap, Palette, Mic2, Trophy, ListMusic, Users, Gauge } from 'lucide-react'

const VERSION = '4.0.0'
const STORAGE_KEY = 'waveify_seen_whatsnew'

const FEATURES = [
  { icon: Radio, title: 'Şarkı Radyosu', desc: 'Çalan şarkıya benzer şarkılarla sonsuz müzik akışı. Radyo modu asla bitmez.' },
  { icon: Zap, title: 'Ses Efektleri', desc: 'Bas geliştirme, yankı (reverb) ve 3D genişlik efektleriyle sesini kişiselleştir.' },
  { icon: Palette, title: 'Akıllı Temalar', desc: 'Çalan şarkının kapak rengine göre arayüz otomatik ambiyans renkleri alır.' },
  { icon: Mic2, title: 'Karaoke Geliştirmesi', desc: 'Sözlere dokun/tıkla, şarkı o satırdan başlasın. Tap-to-seek.' },
  { icon: Trophy, title: 'Haftalık Chart & Liderlik', desc: 'Haftanın en çok dinlenen şarkıları ve en aktif dinleyicileri sıralamada.' },
  { icon: Gauge, title: 'Ruh Hali Karışımları', desc: 'Odak, Enerji, Rahatlama, Parti ve daha fazlası — anlık karışım başlat.' },
  { icon: ListMusic, title: 'Kuyruğu Kaydet', desc: 'Sırandaki şarkıları tek tıkla çalma listesine dönüştür.' },
  { icon: Users, title: 'İşbirlikçi Playlistler', desc: 'Playlistlerini arkadaşlarınla birlikte oluştur ve düzenle.' },
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
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-surface-800/40 bg-gradient-to-r from-wave-500/15 via-transparent to-purple-500/15">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-wave-400 to-purple-500 flex items-center justify-center shadow-lg shadow-wave-500/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">Waveify {VERSION}</h2>
            <p className="text-xs text-surface-400">Devasa güncelleme! Yeni özellikler seni bekliyor</p>
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
          <button onClick={dismiss} className="w-full py-3 rounded-2xl bg-gradient-to-r from-wave-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-wave-500/20">
            Keşfetmeye Başla
          </button>
        </div>
      </div>
    </div>
  )
}