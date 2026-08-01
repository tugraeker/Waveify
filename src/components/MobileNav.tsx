import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Library, Upload, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Ana Sayfa', icon: Home, path: '/' },
  { label: 'Ara', icon: Search, path: '/search' },
  { label: 'Kitaplık', icon: Library, path: '/library' },
  { label: 'Yükle', icon: Upload, path: '/upload' },
  { label: 'Profil', icon: User, path: '/profile' },
]

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="md:hidden bg-surface-950 border-t border-surface-800/50 z-40 flex items-stretch px-1 pb-[max(env(safe-area-inset-bottom),0px)]">
      {items.map(({ label, icon: Icon, path }) => {
        const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors',
              active ? 'text-wave-400' : 'text-surface-500 hover:text-white'
            )}
          >
            <Icon size={20} className={active ? 'drop-shadow-[0_0_6px_rgba(34,199,192,0.6)]' : ''} />
            <span className="text-[9px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
