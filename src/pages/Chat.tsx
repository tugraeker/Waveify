import { useState, useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useChat } from '@/hooks/useChat'
import { useStore } from '@/store/store'
import { Hash, Volume2, Plus, Send, LogIn, LogOut, Mic, MicOff, Monitor, Users, MessageSquare, ScreenShare, PhoneOff } from 'lucide-react'

export default function ChatPage() {
  const { socket } = useSocket()
  const { user } = useStore()
  const {
    servers, channels, messages, activeChannel, setActiveChannel, setMessages,
    voiceParticipants, inVoice, voiceChannelId, isScreenSharing, localMuted,
    fetchServers, fetchChannels, selectChannel, sendMessage, createServer, joinServer,
    joinVoice, leaveVoice, toggleMute, toggleScreenShare,
  } = useChat(socket)

  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [msgInput, setMsgInput] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [serverName, setServerName] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinId, setJoinId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const activeCh = channels.find(c => c.id === activeChannel)

  async function handleCreate() {
    if (!serverName.trim()) return
    const s = await createServer(serverName.trim())
    if (s) { setServerName(''); setShowCreate(false); setSelectedServer(s.id); fetchChannels(s.id) }
  }

  async function handleJoin() {
    if (!joinId.trim()) return
    await joinServer(joinId.trim()); setJoinId(''); setShowJoin(false)
  }

  function selectServer(serverId: string) {
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

  return (
    <div className="flex h-full animate-fade-in">
      <div className="w-16 bg-surface-900 flex flex-col items-center gap-2 py-3 border-r border-surface-800 overflow-y-auto scrollbar-thin">
        {servers.map(s => (
          <button key={s.id} onClick={() => selectServer(s.id)} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${selectedServer === s.id ? 'bg-wave-500 text-white rounded-xl' : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:rounded-xl'}`} title={s.name}>
            {s.name[0]?.toUpperCase()}
          </button>
        ))}
        <button onClick={() => setShowCreate(true)} className="w-11 h-11 rounded-2xl bg-surface-800 text-green-400 hover:bg-green-500/20 hover:rounded-xl transition-all flex items-center justify-center" title="Sunucu Oluştur">
          <Plus size={18} />
        </button>
        <button onClick={() => setShowJoin(true)} className="w-11 h-11 rounded-2xl bg-surface-800 text-wave-400 hover:bg-wave-500/20 hover:rounded-xl transition-all flex items-center justify-center" title="Sunucuya Katıl">
          <LogIn size={16} />
        </button>
      </div>

      {selectedServer && (
        <div className="w-56 bg-surface-925 border-r border-surface-800 flex flex-col py-3 overflow-y-auto scrollbar-thin">
          <div className="px-4 mb-3">
            <h2 className="text-sm font-bold text-white truncate">{servers.find(s => s.id === selectedServer)?.name}</h2>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {channels.map(ch => (
              <button key={ch.id} onClick={() => selectChannel(ch.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${activeChannel === ch.id ? 'bg-wave-500/15 text-wave-400' : 'text-surface-400 hover:text-white hover:bg-surface-800'}`}>
                {ch.type === 'voice' ? <Volume2 size={15} /> : <Hash size={15} />}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
          {channels.filter(c => c.type === 'voice').map(ch => {
            const inThisVoice = voiceChannelId === ch.id
            return (
              <div key={`voice-${ch.id}`} className="mt-4 px-4">
                <button onClick={() => inThisVoice ? leaveVoice() : joinVoice(ch.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full transition-all ${inThisVoice ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-surface-800 text-surface-400 hover:text-white border border-surface-700'}`}>
                  {inThisVoice ? <LogOut size={13} /> : <Volume2 size={13} />}
                  {inThisVoice ? 'Sesten Ayrıl' : 'Sese Katıl'}
                </button>
                {inThisVoice && voiceParticipants.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {voiceParticipants.map(p => (
                      <div key={p.userId} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs">
                        <div className="w-5 h-5 rounded-full bg-surface-700 flex items-center justify-center text-[8px] font-bold">{p.username[0]?.toUpperCase()}</div>
                        <span className="text-surface-300 truncate">{p.username}</span>
                        {p.muted ? <MicOff size={11} className="text-red-400" /> : <Mic size={11} className="text-green-400" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 flex flex-col bg-surface-950">
        {activeChannel ? (
          <>
            <div className="h-14 flex items-center px-6 border-b border-surface-800 bg-surface-925 flex-shrink-0">
              {activeCh?.type === 'voice' ? <Volume2 size={18} className="text-surface-400 mr-2" /> : <Hash size={18} className="text-surface-400 mr-2" />}
              <h2 className="text-sm font-semibold text-white">{activeCh?.name}</h2>
              {activeCh?.type === 'voice' && inVoice && (
                <span className="ml-3 text-xs text-green-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Bağlı</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-surface-500"><MessageSquare size={36} className="opacity-30 mb-3" /><p className="text-sm">Henüz mesaj yok</p></div>
              ) : messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 group hover:bg-surface-900/50 p-2 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {msg.user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{msg.user?.username || 'Bilinmeyen'}</span>
                      <span className="text-[10px] text-surface-500">{new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-surface-300 break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 pt-2 pb-1 flex-shrink-0">
              <div className="flex items-center gap-2 bg-surface-900 rounded-xl border border-surface-700 px-4 py-2.5">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder={`#${activeCh?.name || ''} kanalına mesaj gönder...`} className="flex-1 bg-transparent text-sm text-white placeholder-surface-500 outline-none" />
                <button type="submit" disabled={!msgInput.trim()} className="p-1.5 rounded-lg bg-wave-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-wave-600 transition-colors"><Send size={14} /></button>
              </div>
            </form>
            {inVoice && (
              <div className="flex items-center gap-2 px-4 pb-4">
                <button onClick={toggleMute} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${localMuted ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-surface-400 hover:text-white'}`}>
                  {localMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  {localMuted ? 'Ses Kapalı' : 'Ses Açık'}
                </button>
                <button onClick={toggleScreenShare} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isScreenSharing ? 'bg-wave-500/20 text-wave-400' : 'bg-surface-800 text-surface-400 hover:text-white'}`}>
                  {isScreenSharing ? <ScreenShare size={13} /> : <Monitor size={13} />}
                  {isScreenSharing ? 'Paylaşılıyor' : 'Ekran Paylaş'}
                </button>
                <button onClick={leaveVoice} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all ml-auto">
                  <PhoneOff size={13} /> Sesten Ayrıl
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <Users size={48} className="opacity-30 mb-4" />
            {selectedServer ? <p className="text-sm">Bir kanal seç</p> : <p className="text-sm">Soldan bir sunucu seç veya oluştur</p>}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-900 rounded-2xl p-6 w-96 border border-surface-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Sunucu Oluştur</h2>
            <input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Sunucu adı..." className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 mb-4" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white">İptal</button>
              <button onClick={handleCreate} disabled={!serverName.trim()} className="px-4 py-2 text-sm bg-wave-500 text-white rounded-xl disabled:opacity-30 hover:bg-wave-600">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowJoin(false)}>
          <div className="bg-surface-900 rounded-2xl p-6 w-96 border border-surface-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Sunucuya Katıl</h2>
            <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Sunucu ID..." className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-wave-500 mb-4" onKeyDown={e => e.key === 'Enter' && handleJoin()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-surface-400 hover:text-white">İptal</button>
              <button onClick={handleJoin} disabled={!joinId.trim()} className="px-4 py-2 text-sm bg-wave-500 text-white rounded-xl disabled:opacity-30 hover:bg-wave-600">Katıl</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
