import { EQ_BAND_FREQS, EQ_PRESETS, defaultEqBands } from '@/types'
import { RotateCcw, X } from 'lucide-react'

type Props = {
  eqTab: 'graphic' | 'presets'
  setEqTab: (tab: 'graphic' | 'presets') => void
  bands: number[]
  equalizer: { bass: number; mid: number; treble: number; bands?: number[] }
  setEqualizer: (settings: { bass: number; mid: number; treble: number; bands: number[] }) => void
  eqPresets: Array<{ name: string; bass: number; mid: number; treble: number; bands: number[] }>
  loadEqPreset: (preset: any) => void
  deleteEqPreset: (name: string) => void
  savingPreset: string
  setSavingPreset: (value: string) => void
  handleSavePreset: () => void
  resetEqualizer: () => void
}

export default function EffectsPanel({
  eqTab, setEqTab, bands, equalizer, setEqualizer, eqPresets, loadEqPreset,
  deleteEqPreset, savingPreset, setSavingPreset, handleSavePreset, resetEqualizer,
}: Props) {
  return (
    <section className="glass rounded-2xl border border-white/10 p-4 shadow-[0_18px_50px_rgba(0,0,0,.25)] animate-fade-in">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-black/20 p-1">
          {(['graphic', 'presets'] as const).map((tab) => (
            <button key={tab} onClick={() => setEqTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${eqTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-surface-400 hover:text-white'}`}>
              {tab === 'graphic' ? '10 bant' : 'Presetler'}
            </button>
          ))}
        </div>
        <button onClick={resetEqualizer} className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-white">
          <RotateCcw size={12} /> Sıfırla
        </button>
      </header>

      {eqTab === 'graphic' ? (
        <div className="flex h-32 items-end justify-center gap-1.5 sm:gap-2">
          {EQ_BAND_FREQS.map((freq, index) => {
            const value = bands[index] ?? 0
            return (
              <label key={freq} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className={`w-8 text-center font-mono text-[9px] tabular-nums ${value > 0 ? 'text-wave-300' : value < 0 ? 'text-rose-300' : 'text-surface-500'}`}>
                  {value > 0 ? `+${value}` : value}
                </span>
                <input aria-label={`${freq} Hz`} type="range" min={-10} max={10} step={1} value={value}
                  onChange={(event) => {
                    const nextBands = [...(equalizer.bands || defaultEqBands())]
                    nextBands[index] = Number(event.target.value)
                    setEqualizer({ ...equalizer, bands: nextBands })
                  }}
                  className="h-20 w-full cursor-pointer accent-wave-300 [writing-mode:vertical-lr]" style={{ direction: 'rtl' }} />
                <span className="whitespace-nowrap text-[8px] text-surface-500">{freq >= 1000 ? `${freq / 1000}k` : freq}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {EQ_PRESETS.map((preset) => (
              <button key={preset.name} onClick={() => setEqualizer({ ...equalizer, bands: [...preset.bands] })}
                className="rounded-lg border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[11px] text-surface-300 transition hover:border-wave-300/30 hover:bg-wave-300/10 hover:text-white">
                {preset.name}
              </button>
            ))}
          </div>
          {eqPresets.length > 0 && <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            {eqPresets.map((preset) => (
              <span key={preset.name} className="inline-flex items-center gap-1 rounded-lg bg-wave-300/10 px-2 py-1 text-[11px] text-wave-200">
                <button onClick={() => loadEqPreset(preset)}>{preset.name}</button>
                <button aria-label={`${preset.name} presetini sil`} onClick={() => deleteEqPreset(preset.name)} className="text-wave-200/60 hover:text-white"><X size={11} /></button>
              </span>
            ))}
          </div>}
          <div className="flex gap-2 border-t border-white/10 pt-3">
            <input value={savingPreset} onChange={(event) => setSavingPreset(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleSavePreset() }}
              placeholder="Ayarı preset olarak kaydet" className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none placeholder:text-surface-500 focus:border-wave-300/40" />
            <button onClick={handleSavePreset} disabled={!savingPreset.trim()}
              className="rounded-xl bg-wave-300 px-3 text-xs font-bold text-slate-950 transition hover:bg-wave-200 disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}
    </section>
  )
}
