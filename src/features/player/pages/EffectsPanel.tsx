import { EQ_PRESETS, EQ_BAND_FREQS, ROOM_PRESETS } from '@/types';
import { Zap, Volume1, Disc3, Landmark, Mic2, X } from 'lucide-react';

export default function EffectsPanel(p: any) {
  const { eqTab, setEqTab, bands, equalizer, setEqualizer, eqPresets, loadEqPreset, deleteEqPreset, savingPreset, setSavingPreset, handleSavePreset, resetEqualizer, audioEffects, setAudioEffects } = p;
  return (
    <>
              <div className="glass rounded-2xl p-4 border border-surface-800/50 animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2">
                    <button onClick={() => setEqTab('graphic')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'graphic' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>Grafik</button>
                    <button onClick={() => setEqTab('presets')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'presets' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>Presetler</button>
                    <button onClick={() => setEqTab('effects')} className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${eqTab === 'effects' ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500'}`}>
                      <Zap size={11} className="inline mr-0.5 -mt-0.5" />Efektler
                    </button>
                  </div>
                  <button onClick={resetEqualizer} className="text-xs text-surface-500 hover:text-white">Sıfırla</button>
                </div>

                {eqTab === 'graphic' ? (
                  <div className="flex gap-1.5 justify-center items-end h-28">
                    {EQ_BAND_FREQS.map((freq, i) => {
                      const val = bands[i] || 0
                      const pct = ((val + 10) / 20) * 100
                      return (
                        <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[9px] font-mono tabular-nums"
                            style={{ color: val > 0 ? '#22c7c0' : val < 0 ? '#ef4444' : '#6b7280' }}>
                            {val > 0 ? `+${val}` : val}
                          </span>
                          <input
                            type="range" min={-10} max={10}
                            value={val}
                            onChange={(e) => {
                              const newBands = [...bands]
                              newBands[i] = Number(e.target.value)
                              setEqualizer({ ...equalizer, bands: newBands })
                            }}
                            className="h-20 w-full accent-wave-400 [writing-mode:vertical-lr] appearance-none bg-surface-700 rounded-full"
                            style={{ transform: 'rotate(180deg)' }}
                          />
                          <span className="text-[8px] text-surface-500">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : eqTab === 'presets' ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {eqPresets.map((p: any) => (
                        <div key={p.name} className="flex items-center gap-1 bg-surface-800/50 rounded-lg px-2 py-1">
                          <button onClick={() => loadEqPreset(p)} className="text-[11px] text-wave-400 hover:underline truncate max-w-20">{p.name}</button>
                          <button onClick={() => deleteEqPreset(p.name)} className="text-surface-500 hover:text-red-400 flex-shrink-0"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {EQ_PRESETS.map((p) => (
                        <button key={p.name} onClick={() => {
                          setEqualizer({ ...equalizer, bands: [...p.bands] })
                          const existing = eqPresets.find((ep: any) => ep.name === p.name)
                          if (existing) loadEqPreset(existing)
                        }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-surface-800/50 text-surface-300 hover:text-white transition-colors">
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={savingPreset} onChange={(e) => setSavingPreset(e.target.value)}
                        placeholder="Preset adı..." className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-xs text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-400/50" />
                      <button onClick={handleSavePreset} className="h-8 px-3 rounded-lg bg-wave-500 text-white text-xs font-medium">Kaydet</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Volume1 size={12} />Bas Geliştirme</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.bass > 0 ? `+${Math.round(audioEffects.bass * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.bass}
                        onChange={(e) => setAudioEffects({ ...audioEffects, bass: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Disc3 size={12} />Yankı (Reverb)</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.reverb > 0 ? `+${Math.round(audioEffects.reverb * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.reverb}
                        onChange={(e) => setAudioEffects({ ...audioEffects, reverb: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Landmark size={12} />3D Genişlik</span>
                        <span className="text-[10px] text-wave-400 font-mono">{audioEffects.spatial > 0 ? `+${Math.round(audioEffects.spatial * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.spatial}
                        onChange={(e) => setAudioEffects({ ...audioEffects, spatial: Number(e.target.value) })}
                        className="w-full accent-wave-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Mic2 size={12} />Karaoke — Vokal Kaldır</span>
                        <span className="text-[10px] text-fuchsia-400 font-mono">{audioEffects.vocal ? `${Math.round((audioEffects.vocal || 0) * 100)}%` : '%0'}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.vocal || 0}
                        onChange={(e) => setAudioEffects({ ...audioEffects, vocal: Number(e.target.value), vocalIso: false })}
                        className="w-full accent-fuchsia-400" />
                    </div>
                    <label className="flex items-center justify-between text-xs text-surface-300 cursor-pointer select-none">
                      <span className="flex items-center gap-1"><Zap size={12} />Vokal İzolasyon (sadece vokal)</span>
                      <input type="checkbox" checked={!!audioEffects.vocalIso}
                        onChange={(e) => setAudioEffects({ ...audioEffects, vocalIso: e.target.checked })}
                        className="accent-fuchsia-400 w-3.5 h-3.5" />
                    </label>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Disc3 size={12} />8D Ses (baş dönme seviyesi)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">%{Math.round((audioEffects.eightD || 0) * 100)}</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05} value={audioEffects.eightD || 0}
                        onChange={(e) => setAudioEffects({ ...audioEffects, eightD: Number(e.target.value) })}
                        className="w-full accent-emerald-400" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-surface-300 flex items-center gap-1"><Landmark size={12} />Oda Sahnesi</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ROOM_PRESETS.map((r) => (
                          <button key={r.key} onClick={() => setAudioEffects({ ...audioEffects, room: r.key })}
                            className={`px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                              (audioEffects.room || 'hall') === r.key
                                ? 'bg-wave-500/15 text-wave-300 border-wave-500/40 shadow-sm'
                                : 'bg-surface-800/60 text-surface-500 border-surface-700/60 hover:text-surface-300'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setAudioEffects({ bass: 0, reverb: 0, spatial: 0, vocal: 0, vocalIso: false, eightD: 0, room: 'hall' })}
                      className="text-[11px] text-surface-500 hover:text-white transition-colors">
                      Efektleri Sıfırla
                    </button>
                  </div>
                )}
              </div>
    </>
  );
}
