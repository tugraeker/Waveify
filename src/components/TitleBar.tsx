import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { Minus, Square, X, Bell, UserPlus, User as UserIcon, MessageSquare } from 'lucide-react'

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

function minimize() { window.electronAPI?.minimize() }
function maximize() { window.electronAPI?.maximize() }
function closeWindow() { window.electronAPI?.close() }

export default function TitleBar() {
  const { user } = useStore()
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
    <div className="drag-region h-9 bg-surface-950 flex items-center justify-between px-4 border-b border-surface-800/50 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Logo size={20} />
        <span className="text-xs font-semibold text-surface-300 tracking-wider">Waveify</span>
      </div>
      <div className="flex items-center gap-1 no-drag">
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); if (showNotif) fetchPendingRequests() }}
            className="p-1.5 hover:bg-white/5 rounded-lg text-surface-400 hover:text-white transition-colors relative"
            title="Bildirimler"
          >
            <Bell size={13} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow">
                {pendingCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute top-full right-0 mt-1 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-72 animate-fade-in overflow-hidden" onMouseLeave={() => setShowNotif(false)}>
              <div className="p-3 border-b border-surface-800">
                <p className="text-xs font-semibold text-surface-300 uppercase tracking-wider">Bildirimler</p>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {pendingUsers.length === 0 ? (
                  <p className="text-xs text-surface-500 text-center py-4">Bildirim yok</p>
                ) : pendingUsers.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-800/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-wave-500/20 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={14} className="text-wave-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-200">{req.user?.username || 'Bir kullanıcı'} arkadaşlık isteği gönderdi</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => respond(req.user_id, true)} className="px-2 py-1 rounded-lg bg-wave-500/10 text-wave-400 text-[10px] font-medium hover:bg-wave-500/20 transition-colors">Kabul</button>
                      <button onClick={() => respond(req.user_id, false)} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors">Reddet</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/friends')}
          className="p-1.5 hover:bg-white/5 rounded-lg text-surface-400 hover:text-white transition-colors"
          title="Arkadaşlar"
        >
          <UserIcon size={13} />
        </button>
        <button onClick={minimize} className="p-1.5 hover:bg-white/5 rounded-lg text-surface-400 hover:text-white transition-colors" title="Küçült">
          <Minus size={13} />
        </button>
        <button onClick={maximize} className="p-1.5 hover:bg-white/5 rounded-lg text-surface-400 hover:text-white transition-colors" title="Tam Ekran">
          <Square size={11} />
        </button>
        <button onClick={closeWindow} className="p-1.5 hover:bg-red-500/20 rounded-lg text-surface-400 hover:text-red-400 transition-colors" title="Kapat">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
