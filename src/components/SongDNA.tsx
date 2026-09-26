import React, { useRef, useState } from 'react'
import type { Song } from '@/types'
import { analyzeSong, getSongAuraColor, getMoodEmoji, getMoodLabel } from '@/lib/localAI'
import { formatDuration } from '@/lib/utils'
import { Sparkles, Download, Copy, Check, Dna, Share2, Music2 } from 'lucide-react'
import { emitToast } from '@/hooks/useToast'

interface SongDNAModalProps {
  song: Song
  onClose: () => void
}

export default function SongDNAModal({ song, onClose }: SongDNAModalProps) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const fp = analyzeSong(song)
  const aura = getSongAuraColor(song)

  // Frekans spektrumu / DNA çubukları simülasyonu (deterministik)
  const dnaBars = React.useMemo(() => {
    const bars: { height: number; opacity: number }[] = []
    const seed = (song.id || 'seed').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    for (let i = 0; i < 48; i++) {
      const v = Math.sin((i + seed) * 0.35) * 0.5 + 0.5
      const wave = Math.cos((i * 0.2) + (fp.tempo / 60)) * 0.3 + 0.7
      const height = Math.max(15, Math.min(100, Math.round(v * wave * 100 * (0.4 + fp.energy * 0.6))))
      bars.push({ height, opacity: 0.35 + (height / 100) * 0.65 })
    }
    return bars
  }, [song.id, fp])

  async function handleCopySummary() {
    const summary = `🧬 [Waveify Song DNA]\n🎵 ${song.title} - ${song.artist}\n✨ Mood: ${getMoodEmoji(fp.mood)} ${getMoodLabel(fp.mood)}\n⚡ Enerji: %${Math.round(fp.energy * 100)} | Dans: %${Math.round(fp.danceability * 100)}\n🥁 Tempo: ~${Math.round(fp.tempo)} BPM\n🎨 Aura Rengi: ${aura}\n🏷️ Etiketler: ${fp.tags.join(', ')}`
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      emitToast('Şarkı DNA özeti panoya kopyalandı!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      emitToast('Kopyalama başarısız oldu', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-surface-950 border border-surface-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Glow arka plan */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors"
          style={{ background: aura }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30 transition-colors"
          style={{ background: aura }}
        />

        {/* Modal Başlık */}
        <div className="relative px-6 pt-6 pb-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center border shadow-sm"
              style={{ background: `${aura}22`, borderColor: `${aura}44` }}
            >
              <Dna size={18} style={{ color: aura }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Şarkı DNA Kartı <Sparkles size={14} className="text-amber-400" />
              </h3>
              <p className="text-[11px] text-surface-400">Yapay zeka akustik & frekans analizi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-800/80 text-surface-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* DNA Kartı (Görsel kart) */}
        <div className="p-6 relative z-10" ref={cardRef}>
          <div
            className="p-5 rounded-2xl border backdrop-blur-xl space-y-5 transition-all shadow-lg"
            style={{
              background: `linear-gradient(145deg, ${aura}15 0%, #121214 100%)`,
              borderColor: `${aura}35`,
            }}
          >
            {/* Şarkı Başlık & Kapak */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0 border border-white/10 relative">
                {song.cover_url ? (
                  <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-800 flex items-center justify-center">
                    <Music2 size={24} style={{ color: aura }} />
                  </div>
                )}
                <div
                  className="absolute bottom-1 right-1 px-1 rounded text-[9px] font-bold bg-black/70 text-white"
                >
                  {formatDuration(song.duration)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white truncate">{song.title}</h4>
                <p className="text-xs text-surface-300 truncate">{song.artist}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border"
                    style={{
                      background: `${aura}25`,
                      color: aura,
                      borderColor: `${aura}60`,
                    }}
                  >
                    <span>{getMoodEmoji(fp.mood)}</span>
                    <span>{getMoodLabel(fp.mood)}</span>
                  </span>
                  <span className="text-[11px] font-mono text-surface-400">
                    ~{Math.round(fp.tempo)} BPM
                  </span>
                </div>
              </div>
            </div>

            {/* Akustik Frekans Dalga İzi (DNA Bar Dizisi) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-surface-400 font-mono">
                <span>Frekans İzi</span>
                <span style={{ color: aura }}>Aura: {aura}</span>
              </div>
              <div className="h-16 flex items-center justify-between gap-[3px] px-2 py-1 rounded-xl bg-black/40 border border-white/5">
                {dnaBars.map((bar, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-500"
                    style={{
                      height: `${bar.height}%`,
                      backgroundColor: aura,
                      opacity: bar.opacity,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Özellikler Metrikleri */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center">
                <p className="text-[10px] text-surface-400">Enerji</p>
                <p className="text-sm font-bold text-white mt-0.5">%{Math.round(fp.energy * 100)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center">
                <p className="text-[10px] text-surface-400">Dans</p>
                <p className="text-sm font-bold text-white mt-0.5">%{Math.round(fp.danceability * 100)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center">
                <p className="text-[10px] text-surface-400">Bas Yoğunluğu</p>
                <p className="text-sm font-bold text-white mt-0.5">%{Math.round(fp.bassRatio * 100)}</p>
              </div>
            </div>

            {/* Etiketler */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fp.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-surface-300 border border-white/5"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Aksiyon butonları */}
        <div className="px-6 pb-6 pt-1 flex gap-2.5 z-10">
          <button
            onClick={handleCopySummary}
            className="flex-1 py-2.5 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all border border-surface-700"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Kopyalandı!' : 'DNA Özetini Kopyala'}</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-wave-600 hover:bg-wave-500 text-white font-medium text-xs transition-all shadow-md"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  )
}
