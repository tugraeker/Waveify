import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types'
import { Radio, Users, Play, Pause, SkipForward, SkipBack, Music, MessageCircle, Heart, Share2, Copy, Check, Crown, Headphones, Volume2, VolumeX, UserPlus, Settings, X } from 'lucide-react'

interface Session {
  id: string
  name: string
  host: string
  hostAvatar?: string
  listeners: number
  isLive: boolean
  currentSong?: Song
  genre?: string
  maxListeners: number
}

interface ChatMessage {
  id: string
  user: string
  avatar?: string
  text: string
  time: string
  type: 'message' | 'reaction' | 'system'
}

const MOCK_SESSIONS: Session[] = [
  { id: '1', name: 'Gece Radyosu', host: 'WaveMaster', listeners: 23, isLive: true, genre: 'Lo-Fi', maxListeners: 50 },
  { id: '2', name: 'Sabah Enerjisi', host: 'DJ_Sunrise', listeners: 45, isLive: true, genre: 'Pop', maxListeners: 100 },
  { id: '3', name: 'Rock Gecesi', host: 'RockHunter', listeners: 12, isLive: true, genre: 'Rock', maxListeners: 30 },
  { id: '4', name: 'Çalışma Modu', host: 'FocusPro', listeners: 67, isLive: true, genre: 'Classical', maxListeners: 200 },
]

const MOCK_CHAT: ChatMessage[] = [
  { id: '1', user: 'MusicLover', text: 'Bu şarkı çok güzel! 🎵', time: '2 dk önce', type: 'message' },
  { id: '2', user: 'DJ_Sunrise', text: 'Teşekkürler! Sıradaki şarkı daha iyi olacak 🔥', time: '1 dk önce', type: 'message' },
  { id: '3', user: 'System', text: 'WaveUser123 odaya katıldı', time: '1 dk önce', type: 'system' },
  { id: '4', user: 'BeatFan', text: '❤️', time: '30 sn önce', type: 'reaction' },
]

export default function LiveSessions() {
  const { user, currentSong, isPlaying, setIsPlaying, setCurrentSong, songs } = useStore()
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>(MOCK_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [copied, setCopied] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const handleJoinSession = (session: Session) => {
    setActiveSession(session)
    setChat([
      { id: '1', user: 'System', text: `${user?.username || 'Kullanıcı'} odaya katıldı`, time: 'şimdi', type: 'system' },
    ])
  }

  const handleLeaveSession = () => {
    setActiveSession(null)
    setChatInput('')
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      user: user?.username || 'Kullanıcı',
      text: chatInput,
      time: 'şimdi',
      type: chatInput.startsWith('❤️') || chatInput.startsWith('🔥') || chatInput.startsWith('🎉') ? 'reaction' : 'message',
    }
    setChat(prev => [...prev, newMsg])
    setChatInput('')
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`https://waveify.app/invite/${activeSession?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateSession = () => {
    if (!newSessionName.trim()) return
    const newSession: Session = {
      id: Date.now().toString(),
      name: newSessionName,
      host: user?.username || 'Kullanıcı',
      listeners: 1,
      isLive: true,
      genre: 'Genel',
      maxListeners: 50,
    }
    setSessions(prev => [...prev, newSession])
    setNewSessionName('')
    setShowCreateModal(false)
    handleJoinSession(newSession)
  }

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song)
    setIsPlaying(true)
  }

  if (activeSession) {
    return (
      <div className="min-h-screen bg-surface-950 pb-24">
        {/* Session Header */}
        <div className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleLeaveSession} className="text-surface-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <Radio size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{activeSession.name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold animate-pulse">CANLI</span>
                </div>
                <p className="text-xs text-surface-400">{activeSession.host} tarafından sunuluyor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyInvite}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 text-xs text-surface-300 hover:border-wave-500/50 transition-all">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? 'Kopyalandı' : 'Davet Et'}
              </button>
            </div>
          </div>
        </div>

        {/* Session Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Now Playing */}
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeSession.currentSong?.cover_url ? (
                  <img src={activeSession.currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={28} className="text-surface-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{activeSession.currentSong?.title || 'Şarkı bekleniyor...'}</p>
                <p className="text-sm text-surface-400 truncate">{activeSession.currentSong?.artist || 'DJ'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-surface-500">{activeSession.genre}</span>
                  <span className="text-xs text-surface-500">•</span>
                  <span className="text-xs text-surface-500">{activeSession.listeners} dinleyici</span>
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <button className="text-surface-400 hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
              </button>
              <button className="text-surface-400 hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>
              <button onClick={() => setIsMuted(!isMuted)}
                className="text-surface-400 hover:text-white transition-colors ml-4">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>

          {/* Listeners */}
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-wave-400" />
                Dinleyiciler ({activeSession.listeners})
              </h3>
              <Crown size={16} className="text-amber-400" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm border-2 border-amber-400">
                  {activeSession.host.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] text-amber-400">{activeSession.host}</span>
                <span className="text-[9px] text-surface-500">DJ</span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center text-surface-300 font-bold text-sm">
                    K{i}
                  </div>
                  <span className="text-[10px] text-surface-400">Kullanıcı{i}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <MessageCircle size={16} className="text-wave-400" />
              Canlı Sohbet
            </h3>
            <div className="h-48 overflow-y-auto space-y-3 mb-4 scrollbar-thin">
              {chat.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {msg.type === 'system' ? (
                    <span className="text-[11px] text-surface-500 bg-surface-800/50 px-3 py-1 rounded-full">{msg.text}</span>
                  ) : msg.type === 'reaction' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-[10px] text-surface-300">
                        {msg.user.charAt(0)}
                      </div>
                      <span className="text-lg">{msg.text}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-wave-500/20 flex items-center justify-center text-[10px] text-wave-400 flex-shrink-0 mt-0.5">
                        {msg.user.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-wave-400">{msg.user}</span>
                          <span className="text-[10px] text-surface-500">{msg.time}</span>
                        </div>
                        <p className="text-sm text-surface-200">{msg.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Reactions */}
            <div className="flex gap-2 mb-3">
              {['❤️', '🔥', '🎉', '👏', '😍', '💯'].map((emoji) => (
                <button key={emoji} onClick={() => {
                  const newMsg: ChatMessage = {
                    id: Date.now().toString(),
                    user: user?.username || 'Kullanıcı',
                    text: emoji,
                    time: 'şimdi',
                    type: 'reaction',
                  }
                  setChat(prev => [...prev, newMsg])
                }}
                  className="w-8 h-8 rounded-full bg-surface-800/60 flex items-center justify-center hover:bg-surface-700 transition-colors text-sm">
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50"
              />
              <button type="submit" disabled={!chatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-wave-600 text-white text-sm font-medium hover:bg-wave-500 transition-colors disabled:opacity-30">
                Gönder
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Radio size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Live Sessions</h1>
              <p className="text-xs text-surface-400">Arkadaşlarınla birlikte müzik dinle</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-wave-600 text-white text-sm font-medium hover:bg-wave-500 transition-colors">
            <UserPlus size={16} />
            Oda Oluştur
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleJoinSession(session)}
              className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 hover:border-wave-500/30 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-wave-500/20 to-purple-600/20 flex items-center justify-center border border-wave-500/20">
                    <Radio size={20} className="text-wave-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-wave-400 transition-colors">{session.name}</h3>
                    <p className="text-xs text-surface-400">{session.host}</p>
                  </div>
                </div>
                {session.isLive && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold animate-pulse">CANLI</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-surface-400" />
                    <span className="text-xs text-surface-300">{session.listeners}/{session.maxListeners}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Headphones size={14} className="text-surface-400" />
                    <span className="text-xs text-surface-300">{session.genre}</span>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-surface-700 border-2 border-surface-900 flex items-center justify-center text-[8px] text-surface-400">
                      {i}
                    </div>
                  ))}
                  {session.listeners > 3 && (
                    <div className="w-6 h-6 rounded-full bg-surface-600 border-2 border-surface-900 flex items-center justify-center text-[8px] text-surface-300">
                      +{session.listeners - 3}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 h-1 bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-wave-500 to-purple-500 rounded-full" style={{ width: `${(session.listeners / session.maxListeners) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-700/50 rounded-3xl p-6 animate-pop-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Yeni Oda Oluştur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-surface-400 font-medium mb-2 block">Oda Adı</label>
                <input
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Örn: Gece Partisi"
                  className="w-full bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50"
                />
              </div>

              <button onClick={handleCreateSession} disabled={!newSessionName.trim()}
                className="w-full py-3 rounded-xl bg-wave-600 text-white font-medium hover:bg-wave-500 transition-colors disabled:opacity-30">
                Oda Oluştur ve Katıl
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
