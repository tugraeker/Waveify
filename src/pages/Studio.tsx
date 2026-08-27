import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types'
import { Headphones, Wand2, Sliders, Volume2, Music, Play, Pause, SkipBack, SkipForward, Download, Save, RotateCcw, Sparkles, Gauge, BarChart3, Waves, Mic, CircleDot, Square, Triangle, Settings, ChevronDown, Check, Loader2 } from 'lucide-react'

type MasteringPreset = 'pop' | 'rock' | 'electronic' | 'jazz' | 'classical' | 'hip-hop' | 'vocal' | 'custom'

interface MasteringConfig {
  preset: MasteringPreset
  loudness: number
  compression: number
  eq: {
    low: number
    mid: number
    high: number
  }
  stereoWidth: number
  limiter: number
  deEsser: number
  reverb: number
}

const PRESETS: { id: MasteringPreset; label: string; icon: any; description: string; settings: Partial<MasteringConfig> }[] = [
  { id: 'pop', label: 'Pop', icon: Music, description: 'Parlak ve enerjik', settings: { loudness: 75, compression: 60, eq: { low: 45, mid: 55, high: 65 }, stereoWidth: 70 } },
  { id: 'rock', label: 'Rock', icon: Waves, description: 'Güçlü ve agresif', settings: { loudness: 70, compression: 65, eq: { low: 55, mid: 50, high: 60 }, stereoWidth: 65 } },
  { id: 'electronic', label: 'Electronic', icon: Gauge, description: 'Derin bass ve Net tiz', settings: { loudness: 80, compression: 70, eq: { low: 70, mid: 40, high: 70 }, stereoWidth: 80 } },
  { id: 'jazz', label: 'Jazz', icon: Headphones, description: 'Doğal ve sıcak', settings: { loudness: 55, compression: 40, eq: { low: 50, mid: 60, high: 55 }, stereoWidth: 60 } },
  { id: 'classical', label: 'Classical', icon: BarChart3, description: 'Geniş dinamik aralık', settings: { loudness: 50, compression: 30, eq: { low: 50, mid: 50, high: 50 }, stereoWidth: 75 } },
  { id: 'hip-hop', label: 'Hip-Hop', icon: CircleDot, description: 'Ağır bass ve punchy', settings: { loudness: 75, compression: 70, eq: { low: 75, mid: 45, high: 55 }, stereoWidth: 60 } },
  { id: 'vocal', label: 'Vocal', icon: Mic, description: 'Net ve odaklı vokal', settings: { loudness: 60, compression: 50, eq: { low: 35, mid: 65, high: 60 }, stereoWidth: 50 } },
  { id: 'custom', label: 'Özel', icon: Settings, description: 'Kendi ayarlarını yap', settings: {} },
]

export default function Studio() {
  const { user, songs, currentSong, isPlaying, setIsPlaying, setCurrentSong } = useStore()
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [config, setConfig] = useState<MasteringConfig>({
    preset: 'pop',
    loudness: 70,
    compression: 60,
    eq: { low: 50, mid: 50, high: 50 },
    stereoWidth: 65,
    limiter: 80,
    deEsser: 30,
    reverb: 20,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [activeTab, setActiveTab] = useState<'master' | 'edit' | 'effects'>('master')

  const handlePresetChange = (preset: MasteringPreset) => {
    const presetData = PRESETS.find(p => p.id === preset)
    if (presetData?.settings) {
      setConfig({
        ...config,
        preset,
        ...presetData.settings,
        eq: { ...config.eq, ...presetData.settings.eq },
      })
    } else {
      setConfig({ ...config, preset })
    }
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2500))
    setIsProcessing(false)
    setIsProcessed(true)
  }

  const handleReset = () => {
    setIsProcessed(false)
    setConfig({
      preset: 'pop',
      loudness: 70,
      compression: 60,
      eq: { low: 50, mid: 50, high: 50 },
      stereoWidth: 65,
      limiter: 80,
      deEsser: 30,
      reverb: 20,
    })
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wand2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Studio</h1>
              <p className="text-xs text-surface-400">AI mastering ve ses düzenleme</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Song Selection */}
        <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Music size={16} className="text-wave-400" />
            Şarkı Seç
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto scrollbar-thin">
            {songs.slice(0, 10).map((song) => (
              <div
                key={song.id}
                onClick={() => setSelectedSong(song)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedSong?.id === song.id
                    ? 'bg-wave-500/10 border-wave-500/50'
                    : 'bg-surface-800/60 border-surface-700 hover:border-surface-500'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music size={16} className="text-surface-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                {selectedSong?.id === song.id && (
                  <Check size={16} className="text-wave-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-surface-900/60 border border-surface-800/50 rounded-2xl p-1.5">
          {[
            { id: 'master' as const, label: 'AI Mastering', icon: Wand2 },
            { id: 'edit' as const, label: 'Düzenleme', icon: Sliders },
            { id: 'effects' as const, label: 'Efektler', icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-surface-800 text-white shadow'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mastering Tab */}
        {activeTab === 'master' && (
          <div className="space-y-6">
            {/* Presets */}
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Mastering Preset'leri</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      config.preset === preset.id
                        ? 'bg-wave-500/10 border-wave-500/50'
                        : 'bg-surface-800/60 border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    <preset.icon size={20} className={`mb-2 ${config.preset === preset.id ? 'text-wave-400' : 'text-surface-400'}`} />
                    <p className="text-sm font-medium text-white">{preset.label}</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Mastering Controls */}
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wand2 size={16} className="text-amber-400" />
                AI Mastering Ayarları
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">Ses Seviyesi (Loudness)</span>
                    <span className="text-xs text-wave-400">{config.loudness}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.loudness}
                    onChange={(e) => setConfig({ ...config, loudness: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">Sıkıştırma (Compression)</span>
                    <span className="text-xs text-wave-400">{config.compression}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.compression}
                    onChange={(e) => setConfig({ ...config, compression: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">Stereo Genişliği</span>
                    <span className="text-xs text-wave-400">{config.stereoWidth}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.stereoWidth}
                    onChange={(e) => setConfig({ ...config, stereoWidth: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">Limiter</span>
                    <span className="text-xs text-wave-400">{config.limiter}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.limiter}
                    onChange={(e) => setConfig({ ...config, limiter: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={!selectedSong || isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-30 shadow-lg shadow-amber-500/25"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  AI İşleniyor...
                </>
              ) : isProcessed ? (
                <>
                  <Check size={20} />
                  Mastering Tamamlandı!
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  AI Mastering Başlat
                </>
              )}
            </button>

            {isProcessed && (
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl bg-surface-800 border border-surface-700 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-700 transition-colors">
                  <Download size={16} />
                  İndir
                </button>
                <button onClick={handleReset}
                  className="flex-1 py-3 rounded-xl bg-surface-800 border border-surface-700 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-700 transition-colors">
                  <RotateCcw size={16} />
                  Sıfırla
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit Tab */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            {/* EQ */}
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Sliders size={16} className="text-wave-400" />
                Equalizer
              </h3>
              <div className="flex items-end justify-between gap-4 h-40">
                {[
                  { label: 'Bass', key: 'low' as const, color: 'from-rose-500 to-orange-500' },
                  { label: 'Mid', key: 'mid' as const, color: 'from-amber-500 to-yellow-500' },
                  { label: 'Treb', key: 'high' as const, color: 'from-emerald-500 to-teal-500' },
                ].map((band) => (
                  <div key={band.key} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-surface-400">{config.eq[band.key]}%</span>
                    <div className="relative w-full flex-1 flex items-end">
                      <div className="w-full bg-surface-800 rounded-full overflow-hidden" style={{ height: '100%' }}>
                        <div className={`w-full bg-gradient-to-t ${band.color} rounded-full transition-all`}
                          style={{ height: `${config.eq[band.key]}%` }} />
                      </div>
                      <input type="range" min="0" max="100" value={config.eq[band.key]}
                        onChange={(e) => setConfig({ ...config, eq: { ...config.eq, [band.key]: Number(e.target.value) } })}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
                    </div>
                    <span className="text-[11px] text-surface-300">{band.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trim/Cut */}
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Kesme & Birleştirme</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] text-surface-400 mb-1 block">Başlangıç</label>
                    <input type="text" placeholder="00:00" className="w-full bg-surface-800/80 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-surface-400 mb-1 block">Bitiş</label>
                    <input type="text" placeholder="03:45" className="w-full bg-surface-800/80 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300 hover:text-white transition-colors">Fade In</button>
                  <button className="flex-1 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300 hover:text-white transition-colors">Fade Out</button>
                  <button className="flex-1 py-2 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300 hover:text-white transition-colors">Trim</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <div className="space-y-6">
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 space-y-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                Ses Efektleri
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">Reverb</span>
                    <span className="text-xs text-wave-400">{config.reverb}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.reverb}
                    onChange={(e) => setConfig({ ...config, reverb: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-400">De-Esser</span>
                    <span className="text-xs text-wave-400">{config.deEsser}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={config.deEsser}
                    onChange={(e) => setConfig({ ...config, deEsser: Number(e.target.value) })}
                    className="w-full accent-wave-400" />
                </div>
              </div>

              {/* Effect Presets */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Konser Salonu', desc: 'Geniş ve doğal', emoji: '🏛️' },
                  { label: 'Stüdyo', desc: 'Kuru ve net', emoji: '🎙️' },
                  { label: 'Uzay', desc: 'Derin ve ethereal', emoji: '🚀' },
                  { label: 'Sokak', desc: 'Canlı ve doğal', emoji: '🌆' },
                ].map((fx) => (
                  <button key={fx.label}
                    className="p-3 rounded-xl bg-surface-800/60 border border-surface-700 text-left hover:border-wave-500/30 transition-all">
                    <span className="text-lg">{fx.emoji}</span>
                    <p className="text-xs font-medium text-white mt-1">{fx.label}</p>
                    <p className="text-[10px] text-surface-400">{fx.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
