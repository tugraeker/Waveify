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
    `flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
      isActive ? 'text-[#8b5cf6]' : 'text-[#a1a1a1]'
    }`

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#181818] border-t border-[#282828] flex items-center justify-around px-2 z-50">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
          <item.icon size={20} />
          <span className="text-xs">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
