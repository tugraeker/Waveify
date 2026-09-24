import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useChat } from '../hooks/useChat'
import { ServerIcon, Avatar, DropdownMenu, SpeakingIndicator } from './ConversationList'
import { MessageGroup } from './MessageView'
import type { ChatMessage } from './MessageView'
import { useStore } from '@/store/store'
import { emitToast } from '@/hooks/useToast'
import {
  Hash, Volume2, Plus, Send, LogIn, LogOut, Mic, MicOff, Monitor,
  Users, MessageSquare, ScreenShare, PhoneOff, Headphones, Settings,
  ChevronDown, Circle, Radio, Copy, Trash2, ExternalLink, Info,
  Keyboard, Gamepad2, Music, X
} from 'lucide-react'

export default function ChatPage() {
  const { socket } = useSocket()
  const { user } = useStore()
  const {
    servers, channels, messages, activeChannel, setActiveChannel, setMessages,
    voiceParticipants, inVoice, voiceChannelId, isScreenSharing, localMuted,
    audioDevices, selectedMic, selectedSpeaker, setSelectedSpeaker, changeMic,
    fetchServers, fetchChannels, selectChannel, sendMessage, createServer, joinServer,
    joinVoice, leaveVoice, toggleMute, toggleScreenShare,
    pushToTalk, togglePushToTalk, pttHeld, handlePttKey,
    replyingTo, setReplyingTo, editMessage, deleteMessage, addReaction,
    blockedUsers, blockUser, unblockUser, uploadFile,
  } = useChat(socket)

  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [msgInput, setMsgInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [serverName, setServerName] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [deafened, setDeafened] = useState(false)
  const [showServerMenu, setShowServerMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showServerCtx, setShowServerCtx] = useState<string | null>(null)
  const [activity, setActivity] = useState<'idle' | 'gaming' | 'songmaking'>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const serverMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pttKeyRef = useRef<string>('Space')

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target as Node)) setShowServerMenu(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (!pushToTalk) return
    function isInputFocused() {
      const tag = document.activeElement?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }
    function down(e: KeyboardEvent) {
      if (e.code === pttKeyRef.current && !e.repeat && !isInputFocused()) handlePttKey(true)
    }
    function up(e: KeyboardEvent) {
      if (e.code === pttKeyRef.current) handlePttKey(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [pushToTalk, handlePttKey])

  const activeCh = channels.find(c => c.id === activeChannel)
  const selectedServerName = servers.find(s => s.id === selectedServer)?.name

  const groupedMessages = useMemo(() => {
    const groups: ChatMessage[][] = []
    for (const msg of messages) {
      const last = groups[groups.length - 1]
      if (last && last[0].user_id === msg.user_id) {
        last.push(msg)
      } else {
        groups.push([msg])
      }
    }
    return groups
  }, [messages])

  function handlePanelDeafen() {
    if (deafened) {
      document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach(el => el.muted = false)
      setDeafened(false)
    } else {
      document.querySelectorAll<HTMLAudioElement>('audio[id^="audio-"]').forEach(el => el.muted = true)
      setDeafened(true)
      if (inVoice && !localMuted) toggleMute()
    }
  }

  async function handleServerLeave(serverId: string) {
    if (!user) return
    const { error } = await (await import('../../../core/supabaseClient')).supabase.from('chat_server_members').delete().eq('server_id', serverId).eq('user_id', user.id)
    if (error) { emitToast('Sunucudan ayrılamadı: ' + error.message, 'error'); return }
    if (selectedServer === serverId) { setSelectedServer(null); setActiveChannel(null); setMessages([]) }
    fetchServers()
    emitToast('Sunucudan ayrıldın', 'success')
  }

  async function handleServerDelete(serverId: string) {
    if (!user) return
    const { error } = await (await import('../../../core/supabaseClient')).supabase.from('chat_servers').delete().eq('id', serverId).eq('created_by', user.id)
    if (error) { emitToast('Sunucu silinemedi: ' + error.message, 'error'); return }
    if (selectedServer === serverId) { setSelectedServer(null); setActiveChannel(null); setMessages([]) }
    fetchServers()
    emitToast('Sunucu silindi', 'success')
  }

  function copyServerId(serverId: string) {
    navigator.clipboard.writeText(serverId)
    emitToast('Sunucu ID kopyalandı', 'success')
  }

  async function handleCreate() {
    if (!serverName.trim()) return
    const s = await createServer(serverName.trim())
    if (s) { setServerName(''); setShowCreate(false); setSelectedServer(s.id); fetchChannels(s.id) }
  }

  async function handleJoin() {
    if (!joinId.trim()) return
    await joinServer(joinId.trim()); setJoinId(''); setShowJoin(false)
  }

  function handleSelectServer(serverId: string) {
    setSelectedServer(serverId)
    setActiveChannel(null)
    setMessages([])
    fetchChannels(serverId)
    setShowServerCtx(null)
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(msgInput)
    setMsgInput('')
  }

  const voiceChannels = channels.filter(c => c.type === 'voice')
  const textChannels = channels.filter(c => c.type === 'text')
  const isServerOwner = selectedServer ? servers.find(s => s.id === selectedServer)?.created_by === user?.id : false
  const meInVoice = voiceParticipants.find(p => p.userId === user?.id)

  const ActivityIcon = activity === 'gaming' ? Gamepad2 : activity === 'songmaking' ? Music : null
  const activityLabel = activity === 'gaming' ? 'Oyun oynuyor' : activity === 'songmaking' ? 'Şarkı yapıyor' : 'Boşta'

  return (
    <div className="flex h-full animate-fade-in">
      {/* ===== SERVER LIST ===== */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center gap-2 py-3 flex-shrink-0 overflow-y-auto scrollbar-thin">
        {servers.map(s => (
          <div key={s.id} className="relative">
            <ServerIcon name={s.name} active={selectedServer === s.id} onClick={() => handleSelectServer(s.id)} onContext={() => setShowServerCtx(showServerCtx === s.id ? null : s.id)} />
            {showServerCtx === s.id && (
              <DropdownMenu items={[
                { label: 'Sunucu ID', icon: <Info size={14} />, onClick: () => copyServerId(s.id) },
                { label: 'Sunucudan Ayrıl', icon: <LogOut size={14} />, onClick: () => handleServerLeave(s.id), danger: true },
                ...(s.created_by === user?.id ? [{ label: 'Sunucuyu Sil', icon: <Trash2 size={14} />, onClick: () => handleServerDelete(s.id), danger: true } as const] : []),
              ]} onClose={() => setShowServerCtx(null)} />
            )}
          </div>
        ))}
        {servers.length > 0 && <div className="w-8 h-[2px] bg-surface-700/50 rounded-full my-1" />}
        <button onClick={() => setShowCreate(true)} className="w-12 h-12 rounded-2xl border-2 border-dashed border-green-500/50 text-green-400 hover:bg-green-500/15 hover:rounded-xl transition-all flex items-center justify-center" title="Sunucu Oluştur">
          <Plus size={20} />
        </button>
        <button onClick={() => setShowJoin(true)} className="w-12 h-12 rounded-2xl border-2 border-dashed border-wave-500/50 text-wave-400 hover:bg-wave-500/15 hover:rounded-xl transition-all flex items-center justify-center" title="Sunucuya Katıl">
          <LogIn size={18} />
        </button>
      </div>

      {/* ===== CHANNEL SIDEBAR ===== */}
      {selectedServer ? (
        <div className="w-60 bg-[#2b2d31] flex flex-col flex-shrink-0">
          {/* Server name header with dropdown */}
          <div className="relative h-12 flex-shrink-0" ref={serverMenuRef}>
            <div onClick={() => setShowServerMenu(!showServerMenu)} className="h-full flex items-center px-4 border-b border-[#1e1f22] cursor-pointer hover:bg-black/10 transition-colors shadow-sm">
              <h2 className="text-base font-semibold text-white truncate flex-1">{selectedServerName}</h2>
              <ChevronDown size={16} className={`text-surface-400 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
            </div>
            {showServerMenu && (
              <div className="absolute z-50 top-full left-0 right-0 mx-2 mt-1 w-[calc(100%-16px)] bg-[#111214] border border-surface-800 rounded-xl py-1.5 shadow-2xl shadow-black/60 animate-fade-in">
                <button onClick={() => { copyServerId(selectedServer!); setShowServerMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-surface-300 hover:bg-white/5 hover:text-white transition-colors">
                  <Copy size={14} /> Sunucu ID'sini Kopyala
                </button>
                <button onClick={() => { handleServerLeave(selectedServer!); setShowServerMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut size={14} /> Sunucudan Ayrıl
                </button>
                {isServerOwner && (
                  <button onClick={() => { handleServerDelete(selectedServer!); setShowServerMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} /> Sunucuyu Sil
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-3">
            {/* VOICE CHANNELS FIRST */}
            {voiceChannels.length > 0 && (
              <div className="px-3 mb-1">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[11px] font-semibold uppercase text-surface-500 tracking-widest flex items-center gap-1.5">
                    <Volume2 size={12} /> Ses Kanalları
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {voiceChannels.map(ch => {
                    const inThisVoice = voiceChannelId === ch.id
                    const channelParticipants = voiceParticipants.filter(p => {
                      return true
                    })
                    return (
                      <div key={ch.id} className="flex flex-col">
                        <div onClick={() => selectChannel(ch.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 cursor-pointer group ${activeChannel === ch.id ? 'bg-[#404249] text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-[#35373c]'}`}>
                          <Volume2 size={16} className={`${activeChannel === ch.id ? 'text-white' : 'text-surface-500'}`} />
                          <span className="truncate flex-1 text-left">{ch.name}</span>
                          <button onClick={e => { e.stopPropagation(); inThisVoice ? leaveVoice() : (joinVoice(ch.id), selectChannel(ch.id)) }} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${inThisVoice ? 'bg-green-500/20 text-green-400' : 'opacity-0 group-hover:opacity-100 bg-surface-800 text-surface-400 hover:text-white'}`}>
                            {inThisVoice ? <LogOut size={10} /> : <Radio size={10} />}
                            {inThisVoice ? 'Ayrıl' : 'Katıl'}
                          </button>
                        </div>
                        {/* Always show participants when connected to this voice channel */}
                        {inThisVoice && voiceParticipants.length > 0 && (
                          <div className="ml-7 mt-0.5 mb-1 flex flex-col gap-0.5 animate-slide-down">
                            {voiceParticipants.map(p => (
                              <div key={p.userId} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs group/participant">
                                <div className="relative flex-shrink-0">
                                  <Avatar name={p.username} size="sm" speaking={p.speaking} />
                                  {p.speaking && (
                                    <div className="absolute -bottom-1 -right-1">
                                      <SpeakingIndicator />
                                    </div>
                                  )}
                                </div>
                                <span className={`text-xs truncate flex-1 ${p.userId === user?.id ? 'text-white font-medium' : 'text-surface-300'}`}>
                                  {p.username}
                                  {p.userId === user?.id && ' (sen)'}
                                </span>
                                {p.muted && !p.speaking && <MicOff size={10} className="text-red-400 flex-shrink-0" />}
                                {p.speaking && (
                                  <div className="flex items-center gap-[1px]">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <div key={i} className="w-[3px] bg-wave-400 rounded-full animate-pulse" style={{ height: `${6 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {inThisVoice && voiceParticipants.length === 0 && (
                          <div className="ml-7 mt-0.5 mb-1 px-2 py-1">
                            <span className="text-[10px] text-surface-500 italic">Henüz katılımcı yok</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TEXT CHANNELS SECOND */}
            {textChannels.length > 0 && (
              <div className={`px-3 mb-1 ${voiceChannels.length > 0 ? 'mt-5' : ''}`}>
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[11px] font-semibold uppercase text-surface-500 tracking-widest flex items-center gap-1.5">
                    <Hash size={12} /> Metin Kanalları
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {textChannels.map(ch => (
                    <button key={ch.id} onClick={() => selectChannel(ch.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 group ${activeChannel === ch.id ? 'bg-[#404249] text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-[#35373c]'}`}>
                      <Hash size={16} className={`${activeChannel === ch.id ? 'text-white' : 'text-surface-500'}`} />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice connection bar — always visible when in voice */}
          {inVoice ? (
            <div className="flex-shrink-0 mx-3 mb-2 p-2.5 rounded-lg glass border-wave-500/20 animate-slide-up">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  {meInVoice?.speaking && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-wave-400/30 animate-ping" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-green-400 truncate">{voiceChannels.find(c => c.id === voiceChannelId)?.name || 'Sesli'}</div>
                  <div className="text-[10px] text-surface-500">{voiceParticipants.length} katılımcı</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); toggleMute() }} className={`p-1.5 rounded-md transition-colors ${localMuted ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-white/10'}`}>
                    {localMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); handlePanelDeafen() }} className={`p-1.5 rounded-md transition-colors ${deafened ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-white/10'}`}>
                    {deafened ? <Headphones size={14} className="line-through" /> : <Headphones size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* User panel */}
          <div className="h-auto min-h-[52px] flex-shrink-0 px-2 py-1.5 bg-[#232428] flex items-center gap-2 border-t border-[#1e1f22]">
            <div className="relative flex-shrink-0">
              <Avatar name={user?.username || '?'} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#232428] flex items-center justify-center">
                <Circle size={7} className="text-green-400" fill="#22c55e" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate leading-tight">{user?.username || 'İsimsiz'}</div>
              <div className="flex items-center gap-1">
                <Circle size={5} className="text-green-400" fill="#22c55e" />
                <span className="text-[10px] text-green-400 font-medium">Çevrimiçi</span>
                {activity !== 'idle' && (
                  <>
                    <span className="text-[10px] text-surface-500 mx-0.5">·</span>
                    {ActivityIcon && <ActivityIcon size={9} className="text-surface-400" />}
                    <span className="text-[10px] text-surface-400">{activityLabel}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={toggleMute} className={`p-1.5 rounded-md transition-colors ${localMuted ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`} title={localMuted ? 'Sesi Aç' : 'Sesini Kapat'}>
                {localMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button onClick={handlePanelDeafen} className={`p-1.5 rounded-md transition-colors ${deafened ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`} title={deafened ? 'Sesi Aç' : 'Sağırlaştır'}>
                {deafened ? <Headphones size={16} className="line-through" /> : <Headphones size={16} />}
              </button>
              <button onClick={togglePushToTalk} className={`p-1.5 rounded-md transition-colors ${pushToTalk ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`} title={pushToTalk ? 'Push to Talk: Açık' : 'Push to Talk: Kapalı'}>
                <Keyboard size={16} />
              </button>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-[#35373c] transition-colors" title="Kullanıcı Ayarları">
                  <Settings size={16} />
                </button>
                {showUserMenu && (
                  <div ref={userMenuRef} className="absolute z-50 bottom-full right-0 mb-2 w-56 bg-[#111214] border border-surface-800 rounded-xl py-1.5 shadow-2xl shadow-black/60 animate-slide-up">
                    <div className="px-3 py-2 border-b border-surface-800 mb-1">
                      <div className="text-sm font-semibold text-white">{user?.username}</div>
                      <div className="text-[10px] text-green-400">Çevrimiçi</div>
                    </div>
                    <div className="px-3 py-2 border-b border-surface-800 mb-1">
                      <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Durum</label>
                      <div className="flex gap-1 mt-1">
                        {(['idle', 'gaming', 'songmaking'] as const).map(a => (
                          <button key={a} onClick={() => setActivity(a)} className={`flex-1 py-1 px-2 rounded-md text-[10px] font-medium transition-colors ${activity === a ? 'bg-wave-500/20 text-wave-400' : 'text-surface-400 hover:text-white hover:bg-white/5'}`}>
                            {a === 'idle' ? 'Boşta' : a === 'gaming' ? 'Oyun' : 'Şarkı'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { copyServerId(selectedServer!); setShowUserMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-surface-300 hover:bg-white/5 hover:text-white transition-colors">
                      <Info size={14} /> Hesap ID
                    </button>
                    <button onClick={() => { emitToast('Yakında', 'info'); setShowUserMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-surface-300 hover:bg-white/5 hover:text-white transition-colors">
                      <ExternalLink size={14} /> Ayarlar
                    </button>
                    <button onClick={() => { emitToast('Yakında', 'info'); setShowUserMenu(false) }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut size={14} /> Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Push to talk indicator */}
          {pushToTalk && (
            <div className={`flex-shrink-0 mx-3 mb-2 p-1.5 rounded-lg text-center text-[10px] font-semibold transition-all duration-100 ${pttHeld ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-surface-800/50 text-surface-400 border border-surface-800'}`}>
              {pttHeld ? '🎤 Konuşuyor...' : `Push to Talk — [${pttKeyRef.current}]`}
            </div>
          )}
        </div>
      ) : (
        <div className="w-60 bg-[#2b2d31] flex flex-col items-center justify-center gap-3 text-surface-500 flex-shrink-0">
          <Users size={32} className="opacity-30" />
          <p className="text-sm text-center px-4">Bir sunucu seç veya yeni sunucu oluştur</p>
        </div>
      )}

      {/* ===== MAIN PANEL ===== */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {activeChannel && activeCh?.type === 'voice' ? (
          <>
            <div className="h-12 flex items-center px-5 border-b border-[#1e1f22] bg-[#2b2d31] flex-shrink-0 shadow-sm">
              <Volume2 size={18} className="text-surface-400 mr-2.5" />
              <h2 className="text-base font-semibold text-white">{activeCh.name}</h2>
              {inVoice && (
                <span className="ml-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[11px] font-semibold glow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Bağlı
                </span>
              )}
            </div>
            {!inVoice ? (
              <div className="flex-1 flex items-center justify-center bg-[#313338]">
                <div className="text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-surface-600">
                    <Volume2 size={32} className="text-surface-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{activeCh.name}</h3>
                  <p className="text-sm text-surface-400 mb-6">Sohbete katılmak için aşağıdaki butona tıkla</p>
                  <button onClick={() => joinVoice(activeChannel)} className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 active:scale-95">
                    <Radio size={18} /> Sese Katıl
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-[#313338]">
                <div className="flex flex-wrap gap-4 justify-center max-w-lg">
                  {voiceParticipants.length === 0 ? (
                    <div className="text-center text-surface-500 text-sm py-8 animate-fade-in">Henüz katılımcı yok. Ses kanalında bekleniyor...</div>
                  ) : voiceParticipants.map(p => (
                    <div key={p.userId} className="flex flex-col items-center gap-2.5 p-5 rounded-xl glass glass-hover min-w-[100px] transition-all duration-200 animate-slide-up border-wave-500/10 hover:border-wave-500/30 hover:shadow-lg hover:shadow-wave-500/5">
                      <div className="relative">
                        <Avatar name={p.username} size="lg" speaking={p.speaking} />
                        {p.speaking && (
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                            <div className="flex items-end gap-[2px] h-4">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="w-[3px] bg-wave-400 rounded-full animate-pulse" style={{ height: `${10 + i * 6}px`, animationDelay: `${i * 0.1}s` }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-surface-300 font-medium truncate max-w-[80px]">{p.username}</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.muted ? 'bg-red-400' : 'bg-green-400'}`} />
                        <span className={`text-[9px] ${p.muted ? 'text-red-400' : 'text-green-400'}`}>{p.muted ? 'Kapalı' : 'Açık'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <button onClick={toggleMute} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${localMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10' : 'glass glass-hover text-surface-300 hover:text-white'}`}>
                    {localMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    {localMuted ? 'Ses Kapalı' : 'Ses Açık'}
                  </button>
                  <button onClick={handlePanelDeafen} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${deafened ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10' : 'glass glass-hover text-surface-300 hover:text-white'}`}>
                    {deafened ? <Headphones size={18} className="line-through" /> : <Headphones size={18} />}
                    {deafened ? 'Ses Kapalı' : 'Sağırlaştır'}
                  </button>
                  <button onClick={toggleScreenShare} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${isScreenSharing ? 'bg-wave-500/20 text-wave-400 border border-wave-500/30 shadow-lg shadow-wave-500/10' : 'glass glass-hover text-surface-300 hover:text-white'}`}>
                    {isScreenSharing ? <ScreenShare size={18} /> : <Monitor size={18} />}
                    {isScreenSharing ? 'Paylaşılıyor' : 'Ekran Paylaş'}
                  </button>
                  <button onClick={leaveVoice} className="flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all active:scale-95 shadow-lg shadow-red-500/5">
                    <PhoneOff size={18} /> Sesten Ayrıl
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
                    <Mic size={14} className="text-surface-500" />
                    <select value={selectedMic} onChange={e => changeMic(e.target.value)} className="bg-transparent text-xs text-surface-300 outline-none max-w-[130px]">
                      <option value="">Mikrofon Seç</option>
                      {audioDevices.filter(d => d.kind === 'audioinput').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mikrofon'}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
                    <Headphones size={14} className="text-surface-500" />
                    <select value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)} className="bg-transparent text-xs text-surface-300 outline-none max-w-[130px]">
                      <option value="">Hoparlör Seç</option>
                      {audioDevices.filter(d => d.kind === 'audiooutput').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Hoparlör'}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeChannel ? (
          <>
            <div className="h-12 flex items-center px-5 border-b border-[#1e1f22] bg-[#2b2d31] flex-shrink-0 shadow-sm">
              <Hash size={18} className="text-surface-400 mr-2.5" />
              <h2 className="text-base font-semibold text-white">{activeCh?.name}</h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-0.5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-surface-500 animate-fade-in">
                  <MessageSquare size={40} className="opacity-20 mb-4" />
                  <p className="text-sm font-medium">#{activeCh?.name} kanalına hoş geldin</p>
                  <p className="text-xs text-surface-600 mt-1">İlk mesajı sen gönder!</p>
                </div>
              ) : groupedMessages.map((group, i) => (
                <MessageGroup key={group[0].id} messages={group} isLast={i === groupedMessages.length - 1}
                  currentUser={user?.id} blockedUsers={blockedUsers}
                  onReply={(msg) => setReplyingTo(msg)}
                  onEdit={(msg) => editMessage(msg.id, msg.content)}
                  onDelete={(msg) => deleteMessage(msg.id)}
                  onReact={(msgId, emoji) => addReaction(msgId, emoji)} />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 px-4 pb-4 pt-0.5">
              {replyingTo && (
                <div className="flex items-center gap-2 mb-1 px-3 py-1.5 bg-surface-800/50 rounded-t-lg text-xs text-surface-400 border-l-2 border-wave-400">
                  <span>Yanıtlanıyor: <strong className="text-wave-400">@{replyingTo.user?.username}</strong>: {replyingTo.content.slice(0, 60)}</span>
                  <button onClick={() => setReplyingTo(null)} className="ml-auto text-surface-500 hover:text-white"><X size={12} /></button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#383a40] rounded-lg px-4 py-2.5 border border-[#1e1f22] focus-within:border-wave-500 transition-all duration-200">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder={`#${activeCh?.name || ''} kanalına mesaj gönder...`} className="flex-1 bg-transparent text-sm text-white placeholder-surface-500 outline-none" />
                <label className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all flex-shrink-0">
                  <input type="file" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const url = await uploadFile(file)
                    if (url) sendMessage(`[${file.name}](${url})`)
                  }} />
                  📎
                </label>
                <button type="submit" disabled={!msgInput.trim()} className="p-1.5 rounded-md bg-wave-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-all active:scale-90 flex-shrink-0">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#313338]">
            <div className="text-center max-w-sm animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-6">
                <Users size={40} className="text-surface-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bir kanal seç</h3>
              <p className="text-sm text-surface-400 leading-relaxed">
                {selectedServer ? 'Soldaki kanal listesinden bir metin veya ses kanalı seçerek sohbete başla.' : 'Soldaki sunucu listesinden bir sunucu seç veya yeni bir sunucu oluştur.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create server modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="glass rounded-xl p-6 w-[420px] shadow-2xl shadow-black/40 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Sunucu Oluştur</h2>
            <p className="text-sm text-surface-400 mb-5">Sunucuna bir isim ver</p>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-xl font-bold text-white mx-auto mb-5 shadow-lg shadow-wave-500/20">
              {serverName[0]?.toUpperCase() || '?'}
            </div>
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5 block">SUNUCU ADI</label>
            <input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Sunucunun adı..." className="w-full bg-[#1e1f22] border border-surface-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 transition-colors mb-5" onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleCreate} disabled={!serverName.trim()} className="px-5 py-2 text-sm bg-wave-500 text-white rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-all active:scale-95">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Join server modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={() => setShowJoin(false)}>
          <div className="glass rounded-xl p-6 w-[420px] shadow-2xl shadow-black/40 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Sunucuya Katıl</h2>
            <p className="text-sm text-surface-400 mb-5">Bir arkadaşının sunucusuna katılmak için ID'sini gir</p>
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5 block">DAVET ID</label>
            <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Sunucu ID..." className="w-full bg-[#1e1f22] border border-surface-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 transition-colors mb-5" onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleJoin} disabled={!joinId.trim()} className="px-5 py-2 text-sm bg-wave-500 text-white rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-all active:scale-95">Katıl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
