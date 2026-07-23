import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import type { Song } from '@/types'
import { Play, ListPlus, Heart, Share2, User, Copy, Trash2 } from 'lucide-react'

interface Props {
  song: Song
  x: number
  y: number
  onClose: () => void
  onAddToPlaylist?: () => void
}

export default function ContextMenu({ song, x, y, onClose, onAddToPlaylist }: Props) {
  const navigate = useNavigate()
  const { user, setCurrentSong, setQueue, queue, addToQueue, songs } = useStore()
  const [liked, setLiked] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      supabase.from('likes').select('id').eq('user_id', user.id).eq('song_id', song.id).maybeSingle().then(({ data }) => {
        setLiked(!!data)
      })
    }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const menuItems = [
    { icon: Play, label: 'Oynat', action: () => { setCurrentSong(song); onClose() } },
    { icon: ListPlus, label: 'Sıraya Ekle', action: () => { addToQueue(song); emitToast('Sıraya eklendi', 'success'); onClose() } },
    ...(onAddToPlaylist ? [{ icon: ListPlus, label: 'Listeye Ekle', action: () => { onAddToPlaylist(); onClose() } }] : []),
    { icon: Heart, label: liked ? 'Beğeniyi Kaldır' : 'Beğen', action: async () => {
      if (!user) return
      if (liked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('song_id', song.id)
        setLiked(false)
        emitToast('Beğeni kaldırıldı', 'info')
      } else {
        await supabase.from('likes').insert({ user_id: user.id, song_id: song.id })
        setLiked(true)
        emitToast('Beğenildi!', 'success')
      }
      onClose()
    }},
    { icon: User, label: 'Sanatçı Sayfası', action: () => { navigate(`/search?q=${encodeURIComponent(song.artist)}`); onClose() } },
    { icon: Copy, label: 'Linki Kopyala', action: () => {
      const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin
      navigator.clipboard.writeText(`${base}/song/${song.id}`)
      emitToast('Link kopyalandı', 'success')
      onClose()
    }},
    ...(song.user_id === user?.id ? [{ icon: Trash2, label: 'Sil', action: async () => {
      await supabase.from('songs').delete().eq('id', song.id)
      emitToast('Şarkı silindi', 'info')
      onClose()
    }}] : []),
  ]

  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 300)

  return (
    <div
      ref={menuRef}
      className="fixed z-[90] bg-surface-900 border border-surface-700 rounded-xl shadow-2xl py-1.5 min-w-[200px] animate-fade-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3.5 py-2 border-b border-surface-800 mb-1">
        <p className="text-xs font-medium text-white truncate">{song.title}</p>
        <p className="text-[10px] text-surface-400 truncate">{song.artist}</p>
      </div>
      {menuItems.map((item, i) => (
        <button
          key={i}
          onClick={item.action}
          className="flex items-center gap-3 w-full px-3.5 py-2 text-sm text-surface-300 hover:text-white hover:bg-white/5 transition-colors text-left"
        >
          <item.icon size={14} className="text-surface-500" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
