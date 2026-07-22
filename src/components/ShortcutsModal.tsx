import { X } from 'lucide-react'

const SHORTCUTS = [
  { key: 'Boşluk', action: 'Oynat / Duraklat' },
  { key: '→', action: '5 saniye ileri sar' },
  { key: '←', action: '5 saniye geri sar' },
  { key: '↑', action: 'Sesi artır' },
  { key: '↓', action: 'Sesi azalt' },
  { key: 'N', action: 'Sonraki şarkı' },
  { key: 'P', action: 'Önceki şarkı' },
  { key: 'S', action: 'Karıştırma aç/kapa' },
  { key: 'R', action: 'Tekrarla aç/kapa' },
  { key: '?', action: 'Bu menüyü göster' },
]

export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Klavye Kısayolları</h2>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-surface-300">{s.action}</span>
              <kbd className="px-2.5 py-1 bg-surface-800 border border-surface-700 rounded-lg text-xs font-mono text-wave-400">{s.key}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-500 mt-4 text-center">Kapatmak için ESC veya dışarı tıkla</p>
      </div>
    </div>
  )
}