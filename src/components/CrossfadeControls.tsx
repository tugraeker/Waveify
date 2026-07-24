import { useState } from 'react'
import { Crosshair } from 'lucide-react'

interface Props {
  crossfade: boolean
  crossfadeDuration: number
  onToggle: () => void
  onDurationChange: (d: number) => void
}

export default function CrossfadeControls({ crossfade, crossfadeDuration, onToggle, onDurationChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`transition-colors ${crossfade ? 'text-wave-400' : 'text-surface-400 hover:text-white'}`}
        title="Geçiş Efekti"
      >
        <Crosshair size={14} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 glass rounded-2xl p-4 border border-surface-800/50 shadow-2xl w-56 animate-fade-in" onMouseLeave={() => setOpen(false)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-surface-300">Geçiş Efekti</span>
            <button
              onClick={onToggle}
              className={`relative w-9 h-5 rounded-full transition-colors ${crossfade ? 'bg-wave-500' : 'bg-surface-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${crossfade ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {crossfade && (
            <div>
              <div className="flex justify-between text-xs text-surface-500 mb-1">
                <span>Süre</span>
                <span>{crossfadeDuration}s</span>
              </div>
              <input
                type="range" min={1} max={10} step={0.5}
                value={crossfadeDuration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="w-full accent-wave-400"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}