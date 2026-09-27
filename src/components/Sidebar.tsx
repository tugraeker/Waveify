import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import {
  Home, Search, Library, Upload, Users,
  MessageSquare, ListMusic, History, Globe,
  Settings, Layers,
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
  { to: '/queue', icon: Layers, label: 'Sıradakiler' },
]

const bottomItems = [
  { to: '/history', icon: History, label: 'Geçmiş' },
  { to: '/import', icon: Globe, label: 'İçe Aktar' },
]

export default function Sidebar() {
  const user = useStore((state) => state.user)
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
    `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 relative ${
      isActive
        ? 'nav-active text-white'
        : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
    }`

  return (
    <aside className="relative z-30 flex h-full w-[248px] flex-col overflow-hidden rounded-[28px] glass-panel">
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-violet-400/[0.11] blur-[75px]" />
      <button
        onClick={() => navigate('/')}
        className="drag-region relative flex h-[78px] flex-shrink-0 items-center gap-3 px-5"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-[15px] border border-white/25 bg-gradient-to-br from-wave-200 via-wave-400 to-[#92c92a] shadow-[0_8px_28px_rgba(198,255,62,0.28)]">
          <span className="font-display text-[15px] font-bold leading-none text-[#11150a]">W</span>
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#11131b] bg-cyan-200" />
        </div>
        <div className="text-left no-drag">
          <span className="block font-display text-[17px] font-bold leading-none tracking-tight text-white">Waveify</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">MÜZİĞİNLE BİRLİKTE</span>
        </div>
      </button>

      <div className="relative mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <nav aria-label="Ana gezinme" className="relative flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-3 py-1">
        {mainItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035] transition-colors group-hover:bg-white/[0.075] group-[.nav-active]:bg-wave-300/10"><item.icon size={16} strokeWidth={2} /></span>
            <span>{item.label}</span>
            {item.to === '/upload' && <span className="ml-auto rounded-full bg-wave-300/10 px-2 py-0.5 text-[9px] font-bold text-wave-200">YENİ</span>}
          </NavLink>
        ))}

        <div className="pt-5 pb-1.5">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Birlikte</p>
        </div>
        {socialItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035] transition-colors group-hover:bg-white/[0.075] group-[.nav-active]:bg-wave-300/10"><item.icon size={16} strokeWidth={2} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-5 pb-1.5">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Oynatıcı</p>
        </div>
        {musicItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035] transition-colors group-hover:bg-white/[0.075] group-[.nav-active]:bg-wave-300/10"><item.icon size={16} strokeWidth={2} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-5 pb-1.5">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Arşiv</p>
        </div>
        {bottomItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035] transition-colors group-hover:bg-white/[0.075] group-[.nav-active]:bg-wave-300/10"><item.icon size={16} strokeWidth={2} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" className={linkClass}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035]"><Settings size={16} /></span>
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="relative mx-3 mb-2 mt-3 rounded-[20px] border border-white/[0.09] bg-black/15 p-2 backdrop-blur-xl">
        <button onClick={() => navigate('/create-playlist')} className="flex w-full items-center gap-3 rounded-[14px] bg-white/[0.045] px-3 py-2.5 text-left transition hover:bg-wave-300/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-wave-200"><Layers size={15} /></span>
          <span className="flex-1 text-xs font-semibold text-white/75">Yeni liste oluştur</span>
          <span className="text-base leading-none text-white/35">+</span>
        </button>
        <div className="mt-2 flex items-center gap-2 rounded-[14px] px-2 py-2">
          <button onClick={() => navigate('/profile')} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-white/15 bg-gradient-to-br from-violet-400/30 to-cyan-300/20 text-xs font-bold text-white">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : (user?.username || 'U')[0].toUpperCase()}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#10121a] bg-emerald-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white/85">{user?.username || 'Dinleyici'}</span>
              <span className="mt-0.5 block truncate text-[9px] text-white/35">Kişisel profilin</span>
            </span>
          </button>
          <NavLink to="/settings" className={({ isActive }) => `flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${isActive ? 'bg-white/10 text-wave-200' : 'text-white/40 hover:bg-white/[0.07] hover:text-white'}`} aria-label="Ayarlar">
            <Settings size={15} />
          </NavLink>
        </div>
      </div>

      <div className="relative px-5 pb-3 text-center text-[9px] tracking-wide text-white/25">
        v{__APP_VERSION__}
      </div>
    </aside>
  )
}
