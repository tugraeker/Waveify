import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import type { Socket } from 'socket.io-client'

interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  created_at: string
  user?: { username: string; avatar_url: string }
}

interface ChatChannel {
  id: string
  server_id: string
  name: string
  type: 'text' | 'voice'
}

interface ChatServer {
  id: string
  name: string
  icon_url: string
  created_by: string
}

interface VoiceParticipant {
  userId: string
  username: string
  muted: boolean
  deafened: boolean
}

export function useChat(socket: Socket | null) {
  const { user } = useStore()
  const [servers, setServers] = useState<ChatServer[]>([])
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([])
  const [inVoice, setInVoice] = useState(false)
  const [voiceChannelId, setVoiceChannelId] = useState<string | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [localMuted, setLocalMuted] = useState(false)

  function createPeer(targetUserId: string, stream: MediaStream) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    pc.onicecandidate = e => {
      if (e.candidate) socket?.emit('voice:ice-candidate', { to: targetUserId, candidate: e.candidate })
    }
    pc.ontrack = e => {
      const audioEl = document.createElement('audio')
      audioEl.srcObject = e.streams[0]
      audioEl.autoplay = true
      audioEl.id = `audio-${targetUserId}`
      const existing = document.getElementById(`audio-${targetUserId}`)
      if (existing) existing.remove()
      document.body.appendChild(audioEl)
    }
    peersRef.current.set(targetUserId, pc)
    return pc
  }

  useEffect(() => {
    if (!user) return
    fetchServers()
  }, [user])

  useEffect(() => {
    if (!socket) return

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('voice:user-joined', async ({ userId: uid, username: uname }) => {
      setVoiceParticipants(prev => {
        if (prev.find(p => p.userId === uid)) return prev
        return [...prev, { userId: uid, username: uname, muted: false, deafened: false }]
      })
      if (!user || !localStreamRef.current || uid === user.id) return
      const pc = createPeer(uid, localStreamRef.current)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('voice:offer', { to: uid, offer })
    })

    socket.on('voice:user-left', (uid: string) => {
      setVoiceParticipants(prev => prev.filter(p => p.userId !== uid))
      const peer = peersRef.current.get(uid)
      if (peer) { peer.close(); peersRef.current.delete(uid) }
      document.getElementById(`audio-${uid}`)?.remove()
    })

    socket.on('voice:participants', (participants: VoiceParticipant[]) => {
      setVoiceParticipants(participants)
    })

    socket.on('voice:offer', async ({ from: fromId, offer }) => {
      if (!user || !localStreamRef.current) return
      const pc = createPeer(fromId, localStreamRef.current)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('voice:answer', { to: fromId, answer })
    })

    socket.on('voice:answer', async ({ from: fromId, answer }) => {
      const pc = peersRef.current.get(fromId)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on('voice:ice-candidate', async ({ from: fromId, candidate }) => {
      const pc = peersRef.current.get(fromId)
      if (pc) try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    })

    return () => {
      socket.off('chat:message')
      socket.off('voice:user-joined')
      socket.off('voice:user-left')
      socket.off('voice:participants')
      socket.off('voice:offer')
      socket.off('voice:answer')
      socket.off('voice:ice-candidate')
    }
  }, [socket])

  async function fetchServers() {
    const { data } = await supabase.from('chat_servers').select('*').limit(50)
    if (data) setServers(data)
  }

  async function fetchChannels(serverId: string) {
    const { data } = await supabase.from('chat_channels').select('*').eq('server_id', serverId).order('created_at')
    if (data) setChannels(data)
  }

  async function fetchMessages(channelId: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, user:users(username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const selectChannel = useCallback((channelId: string) => {
    setActiveChannel(channelId)
    setMessages([])
    socket?.emit('chat:join', channelId)
    fetchMessages(channelId)
  }, [socket])

  const sendMessage = useCallback((content: string) => {
    if (!activeChannel || !content.trim()) return
    socket?.emit('chat:send', { channelId: activeChannel, content: content.trim() })
  }, [socket, activeChannel])

  const createServer = useCallback(async (name: string) => {
    if (!user) return
    const { data: server, error } = await supabase.from('chat_servers').insert({ name, created_by: user.id }).select().single()
    if (error || !server) { emitToast('Sunucu oluşturulamadı: ' + (error?.message || 'Bilinmeyen hata'), 'error'); return }
    const { error: memberErr } = await supabase.from('chat_server_members').insert({ server_id: server.id, user_id: user.id })
    if (memberErr) emitToast('Üye eklenemedi: ' + memberErr.message, 'error')
    const defaultChannels = [
      { server_id: server.id, name: 'genel', type: 'text' },
      { server_id: server.id, name: 'Sesli 1', type: 'voice' },
    ]
    const { error: chErr } = await supabase.from('chat_channels').insert(defaultChannels)
    if (chErr) emitToast('Kanal oluşturulamadı: ' + chErr.message, 'error')
    setServers(prev => [...prev, server])
    emitToast('Sunucu oluşturuldu: ' + server.name, 'success')
    return server
  }, [user])

  const joinServer = useCallback(async (serverId: string) => {
    if (!user) return
    await supabase.from('chat_server_members').insert({ server_id: serverId, user_id: user.id }).select()
    fetchServers()
  }, [user])

  const joinVoice = useCallback(async (channelId: string) => {
    if (!socket || !user) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
    } catch { return }
    setVoiceChannelId(channelId)
    setInVoice(true)
    socket.emit('voice:join', { channelId })
  }, [socket, user])

  const leaveVoice = useCallback(() => {
    if (!socket) return
    socket.emit('voice:leave')
    peersRef.current.forEach(peer => peer.close())
    peersRef.current.clear()
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
    document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove())
    setInVoice(false)
    setVoiceChannelId(null)
    setVoiceParticipants([])
    setIsScreenSharing(false)
  }, [socket])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const enabled = !stream.getAudioTracks()[0]?.enabled
    stream.getAudioTracks().forEach(t => t.enabled = enabled)
    setLocalMuted(!enabled)
    if (socket && voiceChannelId) socket.emit('voice:toggle-mute', { channelId: voiceChannelId, muted: !enabled })
  }, [socket, voiceChannelId])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
      setIsScreenSharing(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      setIsScreenSharing(true)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { setIsScreenSharing(false); screenStreamRef.current = null })
    } catch {}
  }, [isScreenSharing])

  return {
    servers, channels, messages, activeChannel, setActiveChannel, setMessages,
    voiceParticipants, inVoice, voiceChannelId, isScreenSharing, localMuted,
    fetchServers, fetchChannels, selectChannel, sendMessage, createServer, joinServer,
    joinVoice, leaveVoice, toggleMute, toggleScreenShare,
  }
}
