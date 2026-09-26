import React, { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useStore } from '@/store/store'
import { Users, Disc3, Radio, Sparkles, X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSongAuraColor } from '@/lib/localAI'

export default function FriendActivityBubble() {
  const { syncRoom, connected } = useSocket()
  const { currentSong } = useStore()
  const navigate = useNavigate()
  const [minimized, setMinimized] = useState(false)
  const [closed, setClosed] = useState(false)

  // Eğer bir SyncRoom aktifse ve çalan şarkı varsa göster
  if (!connected || !syncRoom || !syncRoom.current_song || closed) {
    return null
  }

  const roomSong = syncRoom.current_song
  const aura = getSongAuraColor(roomSong)
  const listenerCount = (syncRoom.listeners || []).length

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 p-2.5 rounded-full bg-surface-900/90 border border-surface-700/60 shadow-xl cursor-pointer hover:scale-105 transition-all backdrop-blur-md group"
      >
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center animate-spin-slow"
            style={{ background: `${aura}33` }}
          >
            <Disc3 size={18} style={{ color: aura }} />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-950 animate-pulse" />
        </div>
        <span className="text-xs font-semibold text-white pr-2 hidden group-hover:inline">
          {syncRoom.name}
        </span>
      </div>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 w-72 rounded-2xl bg-surface-950/95 border border-surface-700/60 shadow-2xl p-3.5 backdrop-blur-xl animate-slide-up flex flex-col gap-2.5 transition-all">
      {/* Üst Kısım: Başlık & Kapat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Radio size={12} /> Canlı Oda
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="text-[10px] text-surface-400 hover:text-white px-1.5 py-0.5 rounded bg-surface-800"
          >
            Küçült
          </button>
          <button
            onClick={() => setClosed(true)}
            className="text-surface-400 hover:text-white p-1"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Şarkı Bilgisi */}
      <div
        onClick={() => navigate('/sync-room')}
        className="flex items-center gap-3 p-2 rounded-xl bg-surface-900/60 border border-white/5 hover:border-wave-500/40 cursor-pointer transition-all group"
      >
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-surface-800 relative">
          {roomSong.cover_url ? (
            <img src={roomSong.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 size={18} style={{ color: aura }} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ChevronRight size={16} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{roomSong.title}</p>
          <p className="text-[11px] text-surface-400 truncate">{roomSong.artist}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">{syncRoom.name}</p>
        </div>
      </div>

      {/* Dinleyiciler */}
      <div className="flex items-center justify-between text-[11px] text-surface-400 px-1">
        <span className="flex items-center gap-1">
          <Users size={12} className="text-wave-400" />
          <span>{listenerCount} kişi birlikte dinliyor</span>
        </span>
        <button
          onClick={() => navigate('/sync-room')}
          className="text-wave-400 hover:text-wave-300 font-semibold"
        >
          Katıl →
        </button>
      </div>
    </div>
  )
}
