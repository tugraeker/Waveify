import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { Minus, Square, X, Bell, UserPlus, User as UserIcon } from 'lucide-react'

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      platform: string
      getYouTubeAudio: (videoId: string) => Promise<any>
      updateDiscordPresence: (data: any) => void
      checkForUpdates: () => void
      downloadUpdate: () => void
      installUpdate: () => void
      onUpdateChecking: (cb: any) => void
      onUpdateAvailable: (cb: any) => void
      onUpdateNotAvailable: (cb: any) => void
      onUpdateProgress: (cb: any) => void
      onUpdateDownloaded: (cb: any) => void
      onUpdateError: (cb: any) => void
      cacheSave: (songId: string, audioUrl: string) => Promise<any>
      cacheGet: (songId: string) => Promise<any>
      cacheRemove: (songId: string) => Promise<any>
      cacheList: () => Promise<string[]>
      cacheClear: () => Promise<any>
    }
  }
}

function minimize() { window.electronAPI?.minimize() }
function maximize() { window.electronAPI?.maximize() }
function closeWindow() { window.electronAPI?.close() }

export default function TitleBar() {
  const user = useStore((state) => state.user)
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    fetchPendingRequests()
    const interval = setInterval(fetchPendingRequests, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  async function fetchPendingRequests() {
    const { data } = await supabase.from('friends').select('*, user:user_id(id, username)').eq('friend_id', user?.id).eq('status', 'pending')
    if (data) {
      setPendingCount(data.length)
      setPendingUsers(data)
    }
  }

  async function respond(friendUserId: string, accept: boolean) {
    if (!user) return
    if (accept) {
      await supabase.from('friends').update({ status: 'accepted' }).eq('user_id', friendUserId).eq('friend_id', user.id)
    } else {
      await supabase.from('friends').delete().eq('user_id', friendUserId).eq('friend_id', user.id)
    }
    fetchPendingRequests()
  }

  return (
    <div className="hidden md:flex drag-region h-11 items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <Logo size={18} />
        <span className="text-[11px] font-semibold text-white/50 tracking-[0.18em] uppercase">Waveify</span>
      </div>
      <div className="flex items-center gap-0.5 no-drag">
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); if (showNotif) fetchPendingRequests() }}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors relative"
            title="Bildirimler"
          >
            <Bell size={13} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-wave-400 text-black text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute top-full right-0 mt-2 glass-panel rounded-2xl w-72 animate-fade-in overflow-hidden z-50" onMouseLeave={() => setShowNotif(false)}>
              <div className="p-3 border-b border-white/10">
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.18em]">Bildirimler</p>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {pendingUsers.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">Bildirim yok</p>
                ) : pendingUsers.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-wave-400/15 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={14} className="text-wave-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80">{req.user?.username || 'Bir kullanıcı'} arkadaşlık isteği gönderdi</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => respond(req.user_id, true)} className="px-2 py-1 rounded-lg bg-wave-400/15 text-wave-300 text-[10px] font-medium hover:bg-wave-400/25 transition-colors">Kabul</button>
                      <button onClick={() => respond(req.user_id, false)} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-300 text-[10px] font-medium hover:bg-red-500/20 transition-colors">Reddet</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/friends')}
          className="p-1.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
          title="Arkadaşlar"
        >
          <UserIcon size={13} />
        </button>
        <button onClick={minimize} className="p-1.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors" title="Küçült">
          <Minus size={13} />
        </button>
        <button onClick={maximize} className="p-1.5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors" title="Tam Ekran">
          <Square size={11} />
        </button>
        <button onClick={closeWindow} className="p-1.5 hover:bg-red-500/20 rounded-xl text-white/50 hover:text-red-400 transition-colors" title="Kapat">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
