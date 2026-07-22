import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { useSocket } from '@/hooks/useSocket'
import { supabase } from '@/lib/supabase'
import { audioEngine } from '@/lib/audioEngine'
import { Button, Input } from '@/components/ui'
import { emitToast } from '@/hooks/useToast'
import { Play, Pause, Users, Plus, LogOut, Music, Crown, Disc, Wifi, WifiOff, RefreshCw, Copy } from 'lucide-react'
import type { Song } from '@/types'

export default function SyncRoom() {
  const { user, setCurrentSong, setIsPlaying } = useStore()
  const { socket, connected, syncRoom, createRoom, joinRoom, leaveRoom, playInRoom, pauseInRoom, resumeInRoom } = useSocket()
  const [roomName, setRoomName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [showSongPicker, setShowSongPicker] = useState(false)
  const [userSongs, setUserSongs] = useState<Song[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [syncTime, setSyncTime] = useState(0)
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Sync room playback to local audio for non-host users
  useEffect(() => {
    if (!syncRoom || !user) return
    if (syncRoom.host_id === user.id) return

    const state = useStore.getState()
    if (syncRoom.current_song && syncRoom.current_song.id !== state.currentSong?.id) {
      setCurrentSong(syncRoom.current_song)
    }
    if (syncRoom.is_playing) {
      audioEngine.resume()
    } else {
      audioEngine.pause()
    }
    setIsPlaying(syncRoom.is_playing)
  }, [syncRoom?.current_song?.id, syncRoom?.is_playing])

  useEffect(() => {
    if (!socket) return
    socket.on('room:sync', ({ current_time }: { current_time: number }) => {
      setSyncTime(current_time)
      // Sync audio position for non-host users
      const state = useStore.getState()
      if (state.syncRoom && state.user && state.syncRoom.host_id !== state.user.id) {
        const ct = audioEngine.getCurrentTime()
        if (Math.abs(ct - current_time) > 1.5) {
          audioEngine.seek(current_time)
        }
      }
    })
    socket.on('error', (msg: string) => {
      emitToast(msg, 'error')
    })
    return () => { socket.off('room:sync'); socket.off('error') }
  }, [socket])

  useEffect(() => {
    if (syncRoom?.is_playing) {
      timerRef.current = setInterval(() => {
        setSyncTime(prev => prev + 1)
      }, 1000)
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined } }
  }, [syncRoom?.is_playing])

  useEffect(() => {
    if (showSongPicker && user) {
      supabase.from('songs').select('*, user:user_id(id, username)').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
        if (data) setUserSongs(data as any)
      })
    }
  }, [showSongPicker, user])

  function handlePlaySong(song: Song) {
    if (!syncRoom) return
    playInRoom(song)
    setCurrentSong(song)
    setIsPlaying(true)
    setShowSongPicker(false)
  }

  function handleCreate() {
    if (!connected) { emitToast('Sunucuya bağlı değil', 'error'); return }
    if (!roomName.trim()) return
    createRoom(roomName.trim())
    setRoomName('')
  }

  function handleJoin() {
    if (!connected) { emitToast('Sunucuya bağlı değil', 'error'); return }
    if (!roomId.trim()) return
    joinRoom(roomId.trim())
  }

  function handleLeave() {
    leaveRoom()
  }

  function handleCopyRoomId() {
    if (!syncRoom) return
    navigator.clipboard.writeText(syncRoom.id)
    emitToast('Oda ID kopyalandı: ' + syncRoom.id, 'success')
  }

  const [activeRooms, setActiveRooms] = useState<{ id: string; name: string; listenerCount: number }[]>([])
  async function fetchActiveRooms() {
    if (!connected) return
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/api/rooms`)
      const data = await res.json()
      setActiveRooms(data)
    } catch {}
  }

  useEffect(() => {
    if (!socket) return
    socket.on('rooms:list', (list: any[]) => setActiveRooms(list))
    return () => { socket.off('rooms:list') }
  }, [socket])

  useEffect(() => {
    if (tab === 'join' && connected) fetchActiveRooms()
  }, [tab, connected])

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function getProgress(current: number, duration: number) {
    if (!duration) return 0
    return Math.min(100, (current / duration) * 100)
  }

  const isHost = syncRoom?.host_id === user?.id

  if (syncRoom) {
    return (
      <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{syncRoom.name}</h1>
                {isHost && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-wave-500/10 text-wave-400 border border-wave-500/20 rounded-full px-2.5 py-0.5">Ev Sahibi</span>
                )}
              </div>
              <p className="text-sm text-surface-400 mt-1 flex items-center gap-1.5">
                <Users size={14} />
                {syncRoom.listeners?.length || 1} dinleyici
              </p>
              <button onClick={handleCopyRoomId} className="text-xs text-wave-400 hover:text-wave-300 mt-1 flex items-center gap-1 transition-colors">
                ID: {syncRoom.id} <Copy size={11} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isHost && (
                <Button variant="outline" size="sm" onClick={() => setShowSongPicker(true)}>
                  <Music size={14} /> Şarkı Seç
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLeave}>
                <LogOut size={14} /> Çık
              </Button>
            </div>
          </div>

          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-8 text-center">
            {syncRoom.current_song ? (
              <div className="animate-fade-in">
                <div className="w-40 h-40 rounded-2xl bg-surface-800 mx-auto mb-5 flex items-center justify-center overflow-hidden shadow-xl">
                  {syncRoom.current_song.cover_url ? (
                    <img src={syncRoom.current_song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Disc size={48} className="text-surface-600 animate-spin-slow" />
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{syncRoom.current_song.title}</h2>
                <p className="text-surface-400 mb-4">{syncRoom.current_song.artist}</p>

                <div className="max-w-md mx-auto mb-4">
                  <div className="relative h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-wave-500 to-wave-400 transition-all duration-500"
                      style={{ width: `${getProgress(syncRoom.current_time, syncRoom.current_song.duration)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-surface-500 mt-1.5">
                    <span>{formatTime(syncRoom.current_time)}</span>
                    <span>{formatTime(syncRoom.current_song.duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  {isHost ? (
                    syncRoom.is_playing ? (
                      <Button variant="primary" size="lg" onClick={() => { pauseInRoom(); audioEngine.pause(); setIsPlaying(false) }}>
                        <Pause size={20} /> Durdur
                      </Button>
                    ) : (
                      <Button variant="primary" size="lg" onClick={() => {
                        if (syncRoom.current_song) {
                          resumeInRoom()
                          audioEngine.resume()
                          setIsPlaying(true)
                        }
                      }}>
                        <Play size={20} /> Devam Et
                      </Button>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-surface-400">
                      {syncRoom.is_playing ? (
                        <><Pause size={16} className="text-wave-400" /> <span className="text-sm">Yayında</span></>
                      ) : (
                        <><span className="text-sm">Duraklatıldı</span></>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12">
                <Disc size={64} className="mx-auto mb-4 text-surface-700" />
                <p className="text-surface-400 mb-2">Odada henüz şarkı yok</p>
                <p className="text-sm text-surface-500">
                  {isHost ? 'Şarkı seçmek için yukarıdaki butona tıkla' : 'Ev sahibinin bir şarkı seçmesini bekliyor...'}
                </p>
                {isHost && (
                  <Button variant="primary" className="mt-4" onClick={() => setShowSongPicker(true)}>
                    <Music size={16} /> Şarkı Seç
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={14} /> Dinleyiciler ({syncRoom.listeners?.length || 1})
            </h3>
            <div className="flex flex-col gap-2">
              {syncRoom.listeners?.map((listener) => (
                <div key={listener.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40 border border-surface-800/30">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wave-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {listener.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-medium text-white">{listener.username}</span>
                  {listener.id === syncRoom.host_id && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-wave-500/10 text-wave-400 border border-wave-500/20 rounded-full px-2 py-0.5 ml-auto flex items-center gap-1">
                      <Crown size={10} /> Ev Sahibi
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showSongPicker && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSongPicker(false)}>
            <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-surface-800">
                <h2 className="text-lg font-bold mb-3">Şarkı Seç</h2>
                <div className="relative">
                  <Music size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <Input
                    placeholder="Şarkı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                {userSongs.length === 0 ? (
                  <p className="text-center text-surface-500 py-8 text-sm">Hiç şarkı bulunamadı.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {userSongs
                      .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((song) => (
                        <button
                          key={song.id}
                          onClick={() => handlePlaySong(song)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/60 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <Music size={16} className="text-surface-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{song.title}</p>
                            <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                            <p className="text-[10px] text-surface-500 truncate">{(song as any).user?.username || 'Waveify'}</p>
                          </div>
                          <Play size={16} className="text-surface-500 group-hover:text-wave-400 transition-colors flex-shrink-0" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-wave-500/10 flex items-center justify-center">
            <Users size={20} className="text-wave-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Birlikte Dinle</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {connected ? (
              <span className="flex items-center gap-1.5 text-green-400"><Wifi size={12} /> Bağlı</span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-400"><WifiOff size={12} /> Sunucu Kapalı</span>
            )}
          </div>
        </div>

        {!connected && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6">
            <p className="text-sm text-red-400 font-medium">Sunucuya bağlanılamadı</p>
            <p className="text-xs text-red-400/70 mt-1">Socket sunucusu (port 3001) çalışmıyor. Önce <code className="bg-red-500/20 px-1.5 py-0.5 rounded">cd server && npm run dev</code> ile sunucuyu başlat.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setTab('create')}
            className={`p-6 rounded-2xl border text-left transition-all ${tab === 'create' ? 'bg-wave-500/5 border-wave-500/20' : 'bg-surface-900/60 border-surface-800/50 hover:border-surface-700'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tab === 'create' ? 'bg-wave-500/20' : 'bg-surface-800'}`}>
              <Plus size={24} className={tab === 'create' ? 'text-wave-400' : 'text-surface-400'} />
            </div>
            <h2 className="text-lg font-semibold mb-1">Oda Oluştur</h2>
            <p className="text-sm text-surface-400">Kendi odanı kur ve arkadaşlarını davet et</p>
          </button>

          <button
            onClick={() => setTab('join')}
            className={`p-6 rounded-2xl border text-left transition-all ${tab === 'join' ? 'bg-wave-500/5 border-wave-500/20' : 'bg-surface-900/60 border-surface-800/50 hover:border-surface-700'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tab === 'join' ? 'bg-wave-500/20' : 'bg-surface-800'}`}>
              <Play size={24} className={tab === 'join' ? 'text-wave-400' : 'text-surface-400'} />
            </div>
            <h2 className="text-lg font-semibold mb-1">Odaya Katıl</h2>
            <p className="text-sm text-surface-400">Var olan bir odaya oda ID'si ile katıl</p>
          </button>
        </div>

        {tab === 'create' ? (
          <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Oda Oluştur</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Oda adı..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
              <Button variant="primary" onClick={handleCreate} disabled={!roomName.trim()}>
                <Plus size={16} /> Oluştur
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6 mb-4">
              <h2 className="font-semibold mb-4">Oda ID ile Katıl</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Örn: room_1234_abcd"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
                />
                <Button variant="primary" onClick={handleJoin} disabled={!roomId.trim()}>
                  <Play size={16} /> Katıl
                </Button>
              </div>
            </div>

            <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Aktif Odalar</h2>
                <button onClick={fetchActiveRooms} className="text-xs text-surface-500 hover:text-white transition-colors flex items-center gap-1">
                  <RefreshCw size={11} /> Yenile
                </button>
              </div>
              {activeRooms.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">Aktif oda yok</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeRooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-800/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-wave-500/10 flex items-center justify-center flex-shrink-0">
                          <Users size={16} className="text-wave-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{r.name || r.id}</p>
                          <p className="text-xs text-surface-500">{r.listenerCount} dinleyici</p>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => { setRoomId(r.id); joinRoom(r.id) }}>
                        <Play size={14} /> Katıl
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-surface-900/30 border border-surface-800/30 rounded-2xl p-5 mt-6">
          <h3 className="text-sm font-semibold text-surface-400 mb-2 flex items-center gap-2">
            <RefreshCw size={14} /> Nasıl Çalışır?
          </h3>
          <ol className="text-sm text-surface-500 space-y-1.5 list-decimal list-inside">
            <li>Socket sunucusu çalışıyor olmalı (<code className="bg-surface-800 px-1 rounded">cd server && npm run dev</code>)</li>
            <li>Bir oda oluştur veya başkasının oda ID'si ile katıl</li>
             <li>Ev sahibi tüm Waveify kütüphanesinden şarkı seçer</li>
            <li>Herkes aynı anda senkronize şekilde dinler</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
