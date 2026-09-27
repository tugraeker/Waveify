import { NavLink } from 'react-router-dom'
import { Home, Search, Plus, Library, User } from 'lucide-react'

const items = [
  { to: '/', icon: Home, label: 'Ana Sayfa' },
  { to: '/search', icon: Search, label: 'Ara' },
  { to: '/upload', icon: Plus, label: 'Yükle' },
  { to: '/library', icon: Library, label: 'Kitaplık' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function MobileNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-w-[58px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all ${
      isActive ? 'bg-wave-300/[0.075] text-wave-200' : 'text-white/40 hover:bg-white/[0.045] hover:text-white/80'
    }`

  return (
    <nav aria-label="Alt gezinme" className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-[72px] items-center justify-around border-t border-white/[0.08] bg-[#090b13]/85 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_50px_rgba(0,0,0,.25)] backdrop-blur-2xl">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
          <item.icon size={19} strokeWidth={2} />
          <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
