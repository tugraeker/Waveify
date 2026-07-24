import { useState, useEffect } from 'react'
import { useStore } from '@/store/store'
import { Bell, X, Heart, MessageCircle, UserPlus, Music } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'playlist_add' | 'collab_add'
  message: string
  read: boolean
  created_at: string
  data?: any
}

export default function NotificationBell() {
  const { user, unreadNotifCount, setUnreadNotifCount } = useStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchNotifications()
  }, [user?.id])

  async function fetchNotifications() {
    if (!user) return
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/api/notifications/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadNotifCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch {}
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-red-400" />
      case 'comment': return <MessageCircle size={14} className="text-blue-400" />
      case 'follow': return <UserPlus size={14} className="text-green-400" />
      default: return <Music size={14} className="text-wave-400" />
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-surface-400 hover:text-white transition-colors"
      >
        <Bell size={18} />
        {unreadNotifCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
            {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 glass rounded-2xl border border-surface-800/50 shadow-2xl w-80 max-h-96 overflow-y-auto animate-fade-in z-50" onMouseLeave={() => setOpen(false)}>
          <div className="p-3 border-b border-surface-800/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-300">Bildirimler</span>
            <button onClick={() => { setOpen(false) }} className="text-surface-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-surface-500 text-center py-6">Bildirim yok</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-surface-800/30 hover:bg-white/5 transition-colors ${!n.read ? 'bg-wave-500/5' : ''}`}>
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-300">{n.message}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}