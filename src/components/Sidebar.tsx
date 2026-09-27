import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import {
  Home, Search, Library, Upload, Users,
  MessageSquare, ListMusic, History, Globe,
  Settings, User,
} from 'lucide-react'

const mainItems = [
  { to: '/', icon: Home, label: 'Ana Sayfa' },
  { to: '/search', icon: Search, label: 'Ara' },
  { to: '/library', icon: Library, label: 'Kitaplık' },
  { to: '/upload', icon: Upload, label: 'Yükle' },
]

const socialItems = [
  { to: '/friends', icon: Users, label: 'Arkadaşlar' },
  { to: '/chat', icon: MessageSquare, label: 'Sohbet' },
]

const musicItems = [
  { to: '/now-playing', icon: ListMusic, label: 'Şimdi Çalıyor' },
  { to: '/queue', icon: ListMusic, label: 'Sıradakiler' },
]

const bottomItems = [
  { to: '/history', icon: History, label: 'Geçmiş' },
  { to: '/import', icon: Globe, label: 'İçe Aktar' },
]

export default function Sidebar() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) { setIsAdmin(false); return }
    supabase.rpc('admin_check').then(({ data, error }) => {
      if (!error && data === true) setIsAdmin(true)
      else setIsAdmin(false)
    })
  }, [user?.id])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold transition-all duration-150 relative ${
      isActive
        ? 'bg-surface-800 text-white'
        : 'text-surface-400 hover:bg-surface-800/60 hover:text-white'
    }${isActive ? ' before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-wave-400' : ''}`

  return (
    <div className="w-[220px] h-full bg-black border-r border-white/10 flex flex-col overflow-hidden relative z-30">
      <div className="drag-region h-16 flex items-center gap-3 px-5 flex-shrink-0 border-b border-white/10">
        <div className="w-8 h-8 rounded-[4px] bg-wave-400 flex items-center justify-center">
          <span className="font-display font-bold text-black text-sm leading-none">W</span>
        </div>
        <span className="text-lg font-display font-bold text-white tracking-tight">WVFY</span>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1">
        {mainItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Sosyal</p>
        </div>
        {socialItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Müzik</p>
        </div>
        {musicItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-surface-500 uppercase tracking-wider font-medium">Diğer</p>
        </div>
        {bottomItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" className={linkClass}>
            <Settings size={18} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <NavLink to="/profile" className={linkClass}>
          <User size={18} />
          <span>Profilim</span>
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} />
          <span>Ayarlar</span>
        </NavLink>
      </div>

      <div className="px-5 py-2 text-[10px] text-surface-500 text-center border-t border-white/10">
        v{__APP_VERSION__}
      </div>
    </div>
  )
}
