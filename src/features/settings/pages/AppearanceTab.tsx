import { Palette, Monitor, Moon } from 'lucide-react';

const accentColors: { key: any; label: string; color: string }[] = [
  { key: 'wave', label: 'Mor', color: '#8b5cf6' },
];

export default function AppearanceTab(p: any) {
  const { theme, setTheme, accentColor, setAccentColor, bgColor, setBgColor } = p;
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-wave-500/10 flex items-center justify-center"><Palette size={18} className="text-wave-400" /></div>
              <h2 className="text-lg font-semibold">Görünüm</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Tema</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === 'dark' ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>Karanlık</button>
                  <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${theme === 'light' ? 'bg-wave-500/10 text-wave-400 border-wave-500/20' : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'}`}>Aydınlık</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Renk Teması</label>
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((ac) => (
                    <button
                      key={ac.key}
                      onClick={() => setAccentColor(ac.key)}
                      className={`w-9 h-9 rounded-xl transition-all border-2 ${accentColor === ac.key ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: ac.color }}
                      title={ac.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Arkaplan Rengi</label>
                <input
                  type="color"
                  value={bgColor || (theme === 'dark' ? '#020617' : '#ffffff')}
                  onChange={(e) => { setBgColor(e.target.value); localStorage.setItem('waveify_bg_color', e.target.value); document.documentElement.style.setProperty('--custom-bg', e.target.value) }}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-surface-700"
                />
                {bgColor && (
                  <button onClick={() => { setBgColor(''); localStorage.removeItem('waveify_bg_color'); document.documentElement.style.removeProperty('--custom-bg') }} className="ml-2 text-xs text-surface-500 hover:text-white">
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center"><Monitor size={18} className="text-surface-400" /></div>
              <h2 className="text-lg font-semibold">Görünüm</h2>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setTheme('dark')} className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-wave-500/10 border-wave-500/20 text-wave-400' : 'bg-surface-800/50 border-surface-700 text-surface-400'}`}>
                <Moon size={16} className="inline mr-1.5" />Karanlık
              </button>
              <button onClick={() => setTheme('light')} className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${theme === 'light' ? 'bg-wave-500/10 border-wave-500/20 text-wave-400' : 'bg-surface-800/50 border-surface-700 text-surface-400'}`}>
                Aydınlık
              </button>
            </div>
          </div>
    </>
  );
}
