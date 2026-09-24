import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { Keyboard } from 'lucide-react';

export default function HotkeysTab() {
  const { hotkeys, setHotkeys } = useStore();
  const [capturingAction, setCapturingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!capturingAction) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      const next = { ...hotkeys, [capturingAction]: e.code };
      setHotkeys(next);
      setCapturingAction(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [capturingAction, hotkeys, setHotkeys]);
  const HOTKEY_META = [
    { action: 'playpause', label: 'Oynat / Duraklat' },
    { action: 'next', label: 'Sonraki Şarkı' },
    { action: 'prev', label: 'Önceki Şarkı' },
    { action: 'volumeup', label: 'Sesi Aç' },
    { action: 'volumedown', label: 'Sesi Kıs' },
    { action: 'mute', label: 'Sessize Al' },
    { action: 'shuffle', label: 'Karıştır' },
    { action: 'repeat', label: 'Tekrarla' },
    { action: 'highlight', label: 'Highlight Modu' },
    { action: 'instrumental', label: 'Enstrümantal Mod' },
  ];
  const keyLabel = (code: string) => {
    const m: Record<string, string> = { Space: 'Boşluk', ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓' };
    if (m[code]) return m[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  };
  return (
    <>
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Keyboard size={18} className="text-amber-400" /></div>
              <h2 className="text-lg font-semibold">Kısayol Stüdyosu</h2>
            </div>
            <p className="text-xs text-surface-400 mb-3">Her aksiyon için yeni tuşu gösterip bas. Farklı tuşlar için harf, ok veya Boşluk kullan.</p>
            <div className="flex flex-col gap-1.5">
              {HOTKEY_META.map(({ action, label }) => {
                const currentCode = Object.entries(hotkeys).find(([, a]) => a === action)?.[0]
                const capturing = capturingAction === action
                return (
                  <div key={action} className="flex items-center justify-between gap-3 bg-surface-800/50 border border-surface-700/50 rounded-xl px-3 py-2">
                    <span className="text-sm text-surface-300">{label}</span>
                    <button
                      onClick={() => setCapturingAction(capturing ? null : action)}
                      className={`min-w-[90px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${capturing ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse' : currentCode ? 'bg-wave-500/10 border-wave-500/25 text-wave-400' : 'bg-surface-800 border-surface-600 text-surface-500'}`}
                    >
                      {capturing ? 'Bas…' : currentCode ? keyLabel(currentCode) : '—'}
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setHotkeys({ Space: 'playpause', ArrowRight: 'next', ArrowLeft: 'prev', ArrowUp: 'volumeup', ArrowDown: 'volumedown', KeyM: 'mute', KeyN: 'shuffle', KeyR: 'repeat', KeyH: 'highlight', KeyI: 'instrumental' })}
              className="mt-3 text-xs text-surface-500 hover:text-white transition-colors"
            >
              Varsayılanlara dön
            </button>
          </div>
    </>
  );
}
