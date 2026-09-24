import { Sliders } from 'lucide-react';

const coverStyles: { key: any; label: string }[] = [
  { key: 'vinyl', label: '💿 Plak' },
  { key: 'cd', label: '💽 CD' },
  { key: 'cassette', label: '📼 Kaset' },
  { key: 'polaroid', label: '📷 Polaroid' },
];

export default function PlaybackTab(p: any) {
  const { seekStep, setSeekStep, coverStyle, setCoverStyle, normalize, setNormalize, smartShuffle, setSmartShuffle, crossfade, setCrossfade, crossfadeDuration, setCrossfadeDuration } = p;
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><Sliders size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Oynatma & Sahneler</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">İleri/Geri Zıplama Adımı</label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 30].map((s) => (
                    <button key={s} onClick={() => setSeekStep(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${seekStep === s ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>{s}sn</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Kapak Tarzı</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {coverStyles.map((c) => (
                    <button key={c.key} onClick={() => setCoverStyle(c.key)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${coverStyle === c.key ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Ses Normalleştirme</span>
                <button onClick={() => setNormalize(!normalize)} className={`w-11 h-6 rounded-full transition-all ${normalize ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${normalize ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Akıllı Karıştırma <span className="text-[10px] text-surface-500">(aynı sanatçıya takılmaz)</span></span>
                <button onClick={() => setSmartShuffle(!smartShuffle)} className={`w-11 h-6 rounded-full transition-all ${smartShuffle ? 'bg-wave-500' : 'bg-surface-700'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${smartShuffle ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Geçiş (Crossfade)</label>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setCrossfade(!crossfade)} className={`w-11 h-6 rounded-full transition-all ${crossfade ? 'bg-wave-500' : 'bg-surface-700'} relative flex-shrink-0`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${crossfade ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <input
                    type="range" min={0} max={8} step={1} value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    disabled={!crossfade}
                    className="flex-1 accent-wave-400 disabled:opacity-30"
                  />
                  <span className="text-xs text-wave-400 font-mono tabular-nums w-10 text-right">{crossfadeDuration}sn</span>
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
