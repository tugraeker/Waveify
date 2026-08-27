import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import {
  Home, Search, Library, Upload, Users,
  MessageSquare, ListMusic, BarChart3, Trophy,
  Settings, User, Radio, History, Globe,
  Bot, Eye, Radio as RadioIcon, Wand2,
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
  { to: '/discover', icon: Radio, label: 'Keşfet' },
  { to: '/charts', icon: Trophy, label: 'Charts' },
  { to: '/ai-dj', icon: Bot, label: 'AI DJ' },
  { to: '/visual-lab', icon: Eye, label: 'Visual Lab' },
  { to: '/live-sessions', icon: RadioIcon, label: 'Live Sessions' },
  { to: '/studio', icon: Wand2, label: 'Studio' },
]

const bottomItems = [
  { to: '/stats', icon: BarChart3, label: 'İstatistikler' },
  { to: '/badges', icon: Trophy, label: 'Rozetler' },
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
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
      isActive
        ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
        : 'text-[#a1a1a1] hover:bg-[#282828] hover:text-white'
    }`

  return (
    <div className="w-60 h-full bg-[#0a0a0a] border-r border-[#282828] flex flex-col overflow-hidden">
      <div className="drag-region h-14 flex items-center gap-2.5 px-5 flex-shrink-0">
        <Logo size={24} />
        <span className="text-lg font-display font-bold text-white">Waveify</span>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-1">
        {mainItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-[#666666] uppercase tracking-wider font-medium">Sosyal</p>
        </div>
        {socialItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-[#666666] uppercase tracking-wider font-medium">Müzik</p>
        </div>
        {musicItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs text-[#666666] uppercase tracking-wider font-medium">Diğer</p>
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

      <div className="px-3 py-3 border-t border-[#282828]">
        <NavLink to="/profile" className={linkClass}>
          <User size={18} />
          <span>Profilim</span>
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <Settings size={18} />
          <span>Ayarlar</span>
        </NavLink>
      </div>

      <div className="px-5 py-2 text-[10px] text-[#666666] text-center border-t border-[#282828]">
        v{__APP_VERSION__}
      </div>
    </div>
  )
}
