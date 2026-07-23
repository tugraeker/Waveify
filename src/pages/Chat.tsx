import { useState, useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useChat } from '@/hooks/useChat'
import { useStore } from '@/store/store'
import {
  Hash, Volume2, Plus, Send, LogIn, LogOut, Mic, MicOff, Monitor,
  Users, MessageSquare, ScreenShare, PhoneOff, Headphones, Settings,
  ChevronDown, Circle, Radio
} from 'lucide-react'

const AVATAR_COLORS = ['#5865F2', '#ED4245', '#57F287', '#FEE75C', '#EB459E', '#FF73FA', '#00B0F4', '#00E6B2', '#9B59B6', '#1ABC9C']

function colorFromName(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function ServerIcon({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <div className="relative flex items-center justify-center">
      {active && <div className="absolute -left-2.5 w-1 h-9 rounded-r-full bg-white" />}
      <button onClick={onClick} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white transition-all duration-150 ${active ? 'rounded-xl' : 'hover:rounded-xl'}`}
        style={{ background: `linear-gradient(135deg, ${colorFromName(name)}, ${colorFromName(name + 'x')})` }} title={name}>
        {name[0]?.toUpperCase()}
      </button>
    </div>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-12 h-12 text-sm' }
  return (
    <div className={`${dims[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${colorFromName(name)}, ${colorFromName(name + 'x')})` }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

export default function ChatPage() {
  const { socket } = useSocket()
  const { user } = useStore()
  const {
    servers, channels, messages, activeChannel, setActiveChannel, setMessages,
    voiceParticipants, inVoice, voiceChannelId, isScreenSharing, localMuted,
    audioDevices, selectedMic, selectedSpeaker, setSelectedSpeaker, changeMic,
    fetchServers, fetchChannels, selectChannel, sendMessage, createServer, joinServer,
    joinVoice, leaveVoice, toggleMute, toggleScreenShare,
  } = useChat(socket)

  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [msgInput, setMsgInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [serverName, setServerName] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [deafened, setDeafened] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const activeCh = channels.find(c => c.id === activeChannel)
  const selectedServerName = servers.find(s => s.id === selectedServer)?.name

  function toggleDeafen() {
    if (deafened) {
      document.querySelectorAll('audio').forEach(el => el.muted = false)
      setDeafened(false)
    } else {
      document.querySelectorAll('audio').forEach(el => el.muted = true)
      if (!localMuted) toggleMute()
      setDeafened(true)
    }
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
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(msgInput)
    setMsgInput('')
  }

  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  return (
    <div className="flex h-full animate-fade-in">
      {/* ===== SERVER LIST ===== */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center gap-2 py-3 flex-shrink-0 overflow-y-auto scrollbar-thin">
        {servers.map((s, i) => (
          <ServerIcon key={s.id} name={s.name} active={selectedServer === s.id} onClick={() => handleSelectServer(s.id)} />
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
          {/* Server name header */}
          <div className="h-12 flex items-center px-4 border-b border-[#1e1f22] flex-shrink-0 cursor-pointer hover:bg-black/10 transition-colors">
            <h2 className="text-base font-semibold text-white truncate flex-1">{selectedServerName}</h2>
            <ChevronDown size={16} className="text-surface-400" />
          </div>

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-3">
            {textChannels.length > 0 && (
              <div className="px-3 mb-1">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[11px] font-semibold uppercase text-surface-500 tracking-widest">Metin Kanalları</span>
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

            {voiceChannels.length > 0 && (
              <div className="px-3 mt-5 mb-1">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[11px] font-semibold uppercase text-surface-500 tracking-widest">Ses Kanalları</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {voiceChannels.map(ch => {
                    const inThisVoice = voiceChannelId === ch.id
                    return (
                      <div key={ch.id} className="flex flex-col">
                        <div onClick={() => selectChannel(ch.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-100 cursor-pointer group ${activeChannel === ch.id ? 'bg-[#404249] text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-[#35373c]'}`}>
                          <Volume2 size={16} className={`${activeChannel === ch.id ? 'text-white' : 'text-surface-500'}`} />
                          <span className="truncate flex-1 text-left">{ch.name}</span>
                          <button onClick={e => { e.stopPropagation(); inThisVoice ? leaveVoice() : (joinVoice(ch.id), selectChannel(ch.id)) }} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all opacity-0 group-hover:opacity-100 ${inThisVoice ? 'bg-green-500/20 text-green-400' : 'bg-surface-800 text-surface-400 hover:text-white'}`}>
                            {inThisVoice ? <LogOut size={10} /> : <Radio size={10} />}
                            {inThisVoice ? 'Ayrıl' : 'Katıl'}
                          </button>
                        </div>
                        {inThisVoice && voiceParticipants.length > 0 && (
                          <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
                            {voiceParticipants.map(p => (
                              <div key={p.userId} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs">
                                <div className="w-[6px] h-[6px] rounded-full bg-green-400" />
                                <span className="text-surface-300 text-[11px] truncate">{p.username}</span>
                                {p.muted && <MicOff size={10} className="text-red-400 ml-auto" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Voice connected bar */}
          {inVoice && (
            <div className="flex-shrink-0 mx-3 mb-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-green-400 truncate">{voiceChannels.find(c => c.id === voiceChannelId)?.name || 'Sesli'}</div>
                  <div className="text-[10px] text-surface-500">{voiceParticipants.length} katılımcı</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); toggleMute() }} className={`p-1.5 rounded-md transition-colors ${localMuted ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`}>
                    {localMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); toggleDeafen() }} className={`p-1.5 rounded-md transition-colors ${deafened ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`}>
                    {deafened ? <Headphones size={14} className="line-through" /> : <Headphones size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User panel */}
          <div className="h-14 flex-shrink-0 px-2 bg-[#232428] flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <Avatar name={user?.username || '?'} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#232428] flex items-center justify-center">
                <Circle size={7} className="text-green-400" fill="#22c55e" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate leading-tight">{user?.username || 'İsimsiz'}</div>
              <div className="text-[10px] text-green-400 font-medium">Çevrimiçi</div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={toggleMute} className={`p-1.5 rounded-md transition-colors ${localMuted ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`} title={localMuted ? 'Sesi Aç' : 'Sesini Kapat'}>
                {localMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button onClick={toggleDeafen} className={`p-1.5 rounded-md transition-colors ${deafened ? 'bg-red-500/20 text-red-400' : 'text-surface-400 hover:text-white hover:bg-[#35373c]'}`} title={deafened ? 'Sesi Aç' : 'Sağırlaştır'}>
                {deafened ? <Headphones size={16} className="line-through" /> : <Headphones size={16} />}
              </button>
              <button className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-[#35373c] transition-colors" title="Kullanıcı Ayarları">
                <Settings size={16} />
              </button>
            </div>
          </div>
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
            <div className="h-12 flex items-center px-5 border-b border-[#1e1f22] bg-[#2b2d31] flex-shrink-0">
              <Volume2 size={18} className="text-surface-400 mr-2.5" />
              <h2 className="text-base font-semibold text-white">{activeCh.name}</h2>
              {inVoice && (
                <span className="ml-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[11px] font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Bağlı
                </span>
              )}
            </div>
            {!inVoice ? (
              <div className="flex-1 flex items-center justify-center bg-[#313338]">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-surface-600">
                    <Volume2 size={32} className="text-surface-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{activeCh.name}</h3>
                  <p className="text-sm text-surface-400 mb-6">Sohbete katılmak için aşağıdaki butona tıkla</p>
                  <button onClick={() => joinVoice(activeChannel)} className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                    <Radio size={18} /> Sese Katıl
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-[#313338]">
                <div className="flex flex-wrap gap-4 justify-center max-w-lg">
                  {voiceParticipants.length === 0 ? (
                    <div className="text-center text-surface-500 text-sm py-8">Henüz katılımcı yok. Ses kanalında bekleniyor...</div>
                  ) : voiceParticipants.map(p => (
                    <div key={p.userId} className="flex flex-col items-center gap-2.5 p-5 rounded-xl bg-[#2b2d31] border border-[#1e1f22] min-w-[100px] transition-all hover:border-surface-600">
                      <div className="relative">
                        <Avatar name={p.username} size="lg" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#2b2d31] flex items-center justify-center ${p.muted ? 'text-red-400' : 'text-green-400'}`}>
                          {p.muted ? <MicOff size={10} /> : <Mic size={10} />}
                        </div>
                      </div>
                      <span className="text-xs text-surface-300 font-medium truncate max-w-[80px]">{p.username}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${localMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#2b2d31] text-surface-300 hover:text-white border border-[#1e1f22] hover:border-surface-600'}`}>
                    {localMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    {localMuted ? 'Ses Kapalı' : 'Ses Açık'}
                  </button>
                  <button onClick={toggleDeafen} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${deafened ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#2b2d31] text-surface-300 hover:text-white border border-[#1e1f22] hover:border-surface-600'}`}>
                    {deafened ? <Headphones size={18} className="line-through" /> : <Headphones size={18} />}
                    {deafened ? 'Ses Kapalı' : 'Sağırlaştır'}
                  </button>
                  <button onClick={toggleScreenShare} className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${isScreenSharing ? 'bg-wave-500/20 text-wave-400 border border-wave-500/30' : 'bg-[#2b2d31] text-surface-300 hover:text-white border border-[#1e1f22] hover:border-surface-600'}`}>
                    {isScreenSharing ? <ScreenShare size={18} /> : <Monitor size={18} />}
                    {isScreenSharing ? 'Paylaşılıyor' : 'Ekran Paylaş'}
                  </button>
                  <button onClick={leaveVoice} className="flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all">
                    <PhoneOff size={18} /> Sesten Ayrıl
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#2b2d31] rounded-lg px-3 py-2 border border-[#1e1f22]">
                    <Mic size={14} className="text-surface-500" />
                    <select value={selectedMic} onChange={e => changeMic(e.target.value)} className="bg-transparent text-xs text-surface-300 outline-none max-w-[130px]">
                      <option value="">Mikrofon Seç</option>
                      {audioDevices.filter(d => d.kind === 'audioinput').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mikrofon'}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-[#2b2d31] rounded-lg px-3 py-2 border border-[#1e1f22]">
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
            <div className="h-12 flex items-center px-5 border-b border-[#1e1f22] bg-[#2b2d31] flex-shrink-0">
              <Hash size={18} className="text-surface-400 mr-2.5" />
              <h2 className="text-base font-semibold text-white">{activeCh?.name}</h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-surface-500">
                  <MessageSquare size={40} className="opacity-20 mb-4" />
                  <p className="text-sm font-medium">#{activeCh?.name} kanalına hoş geldin</p>
                  <p className="text-xs text-surface-600 mt-1">İlk mesajı sen gönder!</p>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-black/15 transition-colors group">
                  <Avatar name={msg.user?.username || '?'} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white hover:underline cursor-pointer" style={{ color: colorFromName(msg.user?.username || '?') }}>{msg.user?.username || 'Bilinmeyen'}</span>
                      <span className="text-[11px] text-surface-500">{new Date(msg.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-surface-200 leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 px-4 pb-4 pt-0.5">
              <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#383a40] rounded-lg px-4 py-2.5 border border-[#1e1f22] focus-within:border-[#5865F2] transition-colors">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder={`#${activeCh?.name || ''} kanalına mesaj gönder...`} className="flex-1 bg-transparent text-sm text-white placeholder-surface-500 outline-none" />
                <button type="submit" disabled={!msgInput.trim()} className="p-1.5 rounded-md bg-wave-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-colors flex-shrink-0">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#313338]">
            <div className="text-center max-w-sm">
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-[#2b2d31] rounded-xl p-6 w-[420px] border border-[#1e1f22] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Sunucu Oluştur</h2>
            <p className="text-sm text-surface-400 mb-5">Sunucuna bir isim ver</p>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-xl font-bold text-white mx-auto mb-5">
              {serverName[0]?.toUpperCase() || '?'}
            </div>
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5 block">SUNUCU ADI</label>
            <input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Sunucunun adı..." className="w-full bg-[#1e1f22] border border-[#1e1f22] rounded-lg px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 mb-5" onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleCreate} disabled={!serverName.trim()} className="px-5 py-2 text-sm bg-wave-500 text-white rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-colors">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Join server modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowJoin(false)}>
          <div className="bg-[#2b2d31] rounded-xl p-6 w-[420px] border border-[#1e1f22] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Sunucuya Katıl</h2>
            <p className="text-sm text-surface-400 mb-5">Bir arkadaşının sunucusuna katılmak için ID'sini gir</p>
            <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5 block">DAVET ID</label>
            <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Sunucu ID..." className="w-full bg-[#1e1f22] border border-[#1e1f22] rounded-lg px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 mb-5" onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleJoin} disabled={!joinId.trim()} className="px-5 py-2 text-sm bg-wave-500 text-white rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-colors">Katıl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
