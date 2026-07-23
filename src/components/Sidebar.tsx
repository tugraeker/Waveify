import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import {
  Home, Search, Library, Upload, Users,
  Music, Flame, Clock, Heart, TrendingUp,
  Plus, List, Disc3, User, Radio,
  History, Sun, Moon, Globe, Settings as SettingsIcon,
  Activity, BarChart3, Shield, MessageSquare,
} from 'lucide-react'

const navItems = [
  { view: 'home' as const, label: 'Ana Sayfa', icon: Home, path: '/' },
  { view: 'search' as const, label: 'Ara', icon: Search, path: '/search' },
  { view: 'library' as const, label: 'Kitaplık', icon: Library, path: '/library' },
  { view: 'upload' as const, label: 'Yükle', icon: Upload, path: '/upload' },
  { view: 'friends' as const, label: 'Arkadaşlar', icon: Users, path: '/friends' },
  { view: 'chat' as const, label: 'Sohbet', icon: MessageSquare, path: '/chat' },
]

const autoPlaylists = [
  { name: 'En Çok Dinlenenler', icon: Flame, auto_type: 'top50' as const },
  { name: 'Bu Hafta Popüler', icon: TrendingUp, auto_type: 'weekly' as const },
  { name: 'En Son Yüklenenler', icon: Clock, auto_type: 'latest' as const },
  { name: 'Beğenilenler', icon: Heart, auto_type: 'liked' as const },
  { name: 'Arkadaşlarının En Çok Dinledikleri', icon: Music, auto_type: 'friends_top' as const },
]

export default function Sidebar() {
  const { user, sidebarView, setSidebarView, playlists, setActivePlaylist, theme, setTheme } = useStore()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) { setIsAdmin(false); return }
    supabase.rpc('admin_check').then(({ data, error }) => {
      if (!error && data === true) setIsAdmin(true)
      else setIsAdmin(false)
    })
  }, [user?.id])

  const handleNav = (view: typeof sidebarView, path: string) => {
    setSidebarView(view)
    navigate(path)
  }

  return (
    <div className="w-64 bg-surface-950 h-full flex flex-col border-r border-surface-800/30 overflow-hidden">
      <div className="drag-region h-11 flex items-center gap-2.5 px-4 pt-2 flex-shrink-0">
        <Logo size={28} className="shadow-lg shadow-wave-500/20" />
        <span className="text-base font-extrabold text-gradient tracking-tight">Waveify</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        <nav className="flex flex-col gap-0.5 mt-1">
          {navItems.map(({ view, label, icon: Icon, path }) => (
            <button
              key={view}
              onClick={() => handleNav(view, path)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 no-drag',
                sidebarView === view
                  ? 'bg-wave-500/10 text-wave-400 border border-wave-500/20'
                  : 'text-surface-400 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon size={18} className={sidebarView === view ? 'text-wave-400' : ''} />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 mt-1">
          {[
            { icon: List, label: 'Sıradakiler', path: '/queue' },
            { icon: Disc3, label: 'Şimdi Çalıyor', path: '/now-playing' },
            { icon: User, label: 'Profilim', path: '/profile' },
            { icon: Radio, label: 'Birlikte Dinle', path: '/sync-room', highlight: true },
            { icon: History, label: 'Geçmiş', path: '/history' },
            { icon: Activity, label: 'Aktivite', path: '/activity' },
            { icon: BarChart3, label: 'İstatistik', path: '/stats' },
            { icon: Globe, label: 'İçe Aktar', path: '/import' },
          ].map(({ icon: Icon, label, path, highlight }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 no-drag ${
                highlight
                  ? 'text-wave-400 hover:text-white hover:bg-wave-500/10 border border-transparent hover:border-wave-500/20'
                  : 'text-surface-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-[0.1em]">Listelerin</span>
          <button onClick={() => navigate('/create-playlist')} className="text-surface-500 hover:text-wave-400 no-drag transition-colors">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 mt-2">
          {autoPlaylists.map(({ name, icon: Icon, auto_type }) => (
            <button
              key={auto_type}
              onClick={() => {
                setActivePlaylist({ id: auto_type, name, user_id: '', type: 'auto', auto_type, created_at: '' })
                navigate('/playlist')
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-white hover:bg-white/5 transition-all duration-200 no-drag"
            >
              <Icon size={15} className="text-surface-500" />
              {name}
            </button>
          ))}
          <div className="border-t border-surface-800/50 my-2" />
          {playlists.filter((p) => p.type === 'custom').length === 0 ? (
            <p className="px-3 py-2 text-xs text-surface-500 italic">Henüz liste yok</p>
          ) : (
            playlists.filter((p) => p.type === 'custom').map((pl) => (
              <button
                key={pl.id}
                onClick={() => { setActivePlaylist(pl); navigate('/playlist') }}
                className="text-left px-3 py-2 text-sm text-surface-400 hover:text-white hover:bg-white/5 rounded-xl truncate transition-all duration-200 no-drag"
              >
                {pl.name}
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-0.5 mt-3 pt-3 border-t border-surface-800/30">
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/5 transition-all duration-200 no-drag w-full">
              <Shield size={17} /> Admin
            </button>
          )}
          <button onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-white hover:bg-white/5 transition-all duration-200 no-drag w-full">
            <SettingsIcon size={17} /> Ayarlar
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-white hover:bg-white/5 transition-all duration-200 no-drag w-full">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Aydınlık Tema' : 'Karanlık Tema'}
          </button>
        </div>
      </div>
    </div>
  )
}
