import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { Logo } from '@/components/Logo'
import Sidebar from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function MobileTopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useStore()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <>
      <div className="md:hidden h-12 bg-surface-950 border-b border-surface-800/50 flex items-center justify-between px-3 flex-shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-1 text-surface-400 hover:text-white active:scale-95 transition-all"
          aria-label="Menü"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size={26} className="shadow-lg shadow-wave-500/20" />
          <span className="text-base font-extrabold text-gradient tracking-tight">Waveify</span>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full overflow-hidden border border-surface-700 flex items-center justify-center bg-surface-800 active:scale-95 transition-all"
          aria-label="Profil"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-wave-400">{(user?.username || 'U')[0].toUpperCase()}</span>
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
