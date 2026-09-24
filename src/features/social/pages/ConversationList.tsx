import { useRef, useEffect } from 'react'

const AVATAR_COLORS = ['#5865F2', '#ED4245', '#57F287', '#FEE75C', '#EB459E', '#FF73FA', '#00B0F4', '#00E6B2', '#9B59B6', '#1ABC9C']

export function colorFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function SpeakingIndicator() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, height: `${30 + Math.random() * 60}%` }} />
      ))}
    </div>
  )
}

export function ServerIcon({ name, active, hasUnread, onClick, onContext }: { name: string; active: boolean; hasUnread?: boolean; onClick: () => void; onContext?: () => void }) {
  return (
    <div className="relative flex items-center justify-center group">
      {active && <div className="absolute -left-2.5 w-1 h-9 rounded-r-full bg-white transition-all" />}
      {!active && hasUnread && <div className="absolute -left-2.5 w-[6px] h-[6px] rounded-full bg-white transition-all group-hover:h-3" />}
      <button onClick={onClick} onContextMenu={e => { e.preventDefault(); onContext?.() }}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white transition-all duration-200 ${active ? 'rounded-xl shadow-lg shadow-black/30' : 'hover:rounded-xl hover:shadow-lg hover:shadow-black/20'}`}
        style={{ background: `linear-gradient(135deg, ${colorFromName(name)}, ${colorFromName(name + 'x')})` }} title={name}>
        {name[0]?.toUpperCase()}
      </button>
    </div>
  )
}

export function Avatar({ name, avatarUrl, size = 'md', speaking }: { name: string; avatarUrl?: string; size?: 'sm' | 'md' | 'lg'; speaking?: boolean }) {
  const dims = { sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-12 h-12 text-sm' }
  const ring = speaking ? 'ring-2 ring-wave-400 ring-offset-2 ring-offset-[#2b2d31]' : ''
  return (
    <div className={`${dims[size]} ${ring} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 transition-all duration-200`}
      style={{ background: avatarUrl ? `url(${avatarUrl}) center/cover` : `linear-gradient(135deg, ${colorFromName(name)}, ${colorFromName(name + 'x')})` }}>
      {!avatarUrl && (name[0]?.toUpperCase() || '?')}
    </div>
  )
}

export function DropdownMenu({ items, onClose }: { items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])
  return (
    <div ref={ref} className="absolute z-50 top-full left-2 mt-1 w-56 bg-[#111214] border border-surface-800 rounded-xl py-1.5 shadow-2xl shadow-black/60 animate-fade-in" onClick={e => e.stopPropagation()}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose() }} className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-surface-300 hover:bg-white/5 hover:text-white'}`}>
          <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}
