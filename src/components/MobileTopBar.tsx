import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import Sidebar from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function MobileTopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useStore((state) => state.user)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <>
      <div className="md:hidden relative z-20 flex h-[54px] flex-shrink-0 items-center justify-between border-b border-white/[0.055] bg-[#0b0d16]/75 px-3 backdrop-blur-2xl">
        <button
          onClick={() => setOpen(true)}
          className="-ml-1 rounded-xl p-2 text-white/55 transition-all hover:bg-white/[0.06] hover:text-white active:scale-95"
          aria-label="Menü"
        >
          <Menu size={22} />
        </button>
        <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate('/')}>
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/20 bg-gradient-to-br from-wave-200 to-wave-500 font-display text-sm font-bold text-black shadow-[0_0_18px_rgba(198,255,62,0.25)]">W</span>
          <span className="font-display text-[15px] font-bold tracking-tight text-white">Waveify</span>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] transition-all active:scale-95"
          aria-label="Profil"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-wave-200">{(user?.username || 'U')[0].toUpperCase()}</span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[150] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute top-0 bottom-0 left-0 flex animate-slide-in-right">
            <Sidebar />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 left-[17.5rem] p-2 text-surface-300 hover:text-white transition-colors"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  )
}
