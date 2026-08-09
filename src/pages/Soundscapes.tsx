import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import { SOUNDSCAPES, startSoundscape, stopSoundscape, getActiveSoundscape, setSoundscapeVolume } from '@/lib/soundscapes'
import { Volume2, VolumeX, Waves } from 'lucide-react'

export default function Soundscapes() {
  const { setIsPlaying } = useStore()
  const [active, setActive] = useState<string | null>(getActiveSoundscape())
  const [vol, setVol] = useState(60)

  function toggle(key: string) {
    if (active === key) {
      stopSoundscape()
      setActive(null)
      return
    }
    audioEngine.pause()
    setIsPlaying(false)
    if (startSoundscape(key)) setActive(key)
  }

  useEffect(() => () => { stopSoundscape() }, [])

  function changeVolume(v: number) {
    setVol(v)
    setSoundscapeVolume(v / 100)
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <Waves size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">Ses Manzaraları</h1>
          <p className="text-xs text-surface-400">Tamamen tarayıcıda üretilen ortam sesleri — internet ve dosya gerekmez</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 mb-6 bg-surface-900/60 border border-surface-800/50 rounded-2xl px-4 py-3 max-w-md animate-fade-in">
        {vol === 0 ? <VolumeX size={16} className="text-surface-400 flex-shrink-0" /> : <Volume2 size={16} className="text-wave-400 flex-shrink-0" />}
        <input type="range" min={0} max={100} value={vol} onChange={(e) => changeVolume(Number(e.target.value))} className="flex-1 accent-wave-400" />
        <span className="text-xs text-surface-500 w-8 text-right tabular-nums">{vol}%</span>
      </div>

      {active && (
        <div className="mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-wave-500/10 border border-wave-500/30 text-wave-400 text-xs font-semibold">
            <span className="flex gap-0.5 items-center">
              {[0, 1, 2].map((b) => <span key={b} className="w-0.5 h-3 bg-wave-400 animate-wave rounded-full" style={{ animationDelay: `${b * 0.15}s` }} />)}
            </span>
            {SOUNDSCAPES.find((s) => s.key === active)?.label} çalıyor — kapatmak için karta tekrar dokun
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
        {SOUNDSCAPES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={`group relative overflow-hidden rounded-2xl p-5 min-h-[140px] flex flex-col items-start justify-between text-left transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br ${s.gradient} ${
              active === s.key ? 'ring-2 ring-white/70 shadow-2xl shadow-white/10' : 'hover:shadow-2xl'
            }`}
          >
            <span className="text-3xl relative z-10">{s.emoji}</span>
            <div>
              <p className="text-base font-bold text-white relative z-10">{s.label}</p>
              <p className="text-[11px] text-white/70 relative z-10 mt-0.5">{s.desc}</p>
            </div>
            <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            {active === s.key && (
              <span className="absolute top-3 right-3 flex gap-0.5 items-center bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
                {[0, 1, 2].map((b) => <span key={b} className="w-0.5 h-3 bg-white animate-wave rounded-full" style={{ animationDelay: `${b * 0.15}s` }} />)}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-surface-500 mt-6 max-w-3xl leading-relaxed">
        İpucu: Başka bir sayfada gezinirken çalmaya devam eder. Müzik çalarken başlatırsan müzik duraklar, kapatınca kaldığın yerden devam edebilirsin.
      </p>
    </div>
  )
}