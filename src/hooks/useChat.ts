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
  speaking: boolean
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
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [localMuted, setLocalMuted] = useState(false)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMic, setSelectedMic] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')
  const [pushToTalk, setPushToTalk] = useState(false)
  const [pttHeld, setPttHeld] = useState(false)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const speakingIntervalRef = useRef<number | null>(null)

  const voiceChannelIdRef = useRef<string | null>(null)

  function startSpeakingDetection(channelId: string, stream: MediaStream) {
    voiceChannelIdRef.current = channelId
    try {
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)
      speakingIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const speaking = avg > 20
        if (socket && voiceChannelIdRef.current) {
          socket.emit('voice:speaking', { channelId: voiceChannelIdRef.current, speaking })
        }
      }, 150)
    } catch {}
  }

  function stopSpeakingDetection() {
    if (speakingIntervalRef.current) { clearInterval(speakingIntervalRef.current); speakingIntervalRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
    analyserRef.current = null
  }

  function createPeer(targetUserId: string, stream: MediaStream) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    pc.onicecandidate = e => {
      if (e.candidate) socket?.emit('voice:ice-candidate', { to: targetUserId, candidate: e.candidate })
    }
    pc.ontrack = e => {
      const existing = document.getElementById(`audio-${targetUserId}`)
      if (existing) existing.remove()
      const audioEl = document.createElement('audio')
      audioEl.srcObject = e.streams[0]
      audioEl.autoplay = true
      audioEl.id = `audio-${targetUserId}`
      if (selectedSpeaker) { try { (audioEl as any).setSinkId(selectedSpeaker) } catch {} }
      document.body.appendChild(audioEl)
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close(); peersRef.current.delete(targetUserId);
        document.getElementById(`audio-${targetUserId}`)?.remove()
      }
    }
    peersRef.current.set(targetUserId, pc)
    return pc
  }

  async function createOfferTo(uid: string) {
    if (!localStreamRef.current) return
    const pc = createPeer(uid, localStreamRef.current)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket?.emit('voice:offer', { to: uid, offer })
  }

  useEffect(() => {
    if (!selectedSpeaker) return
    document.querySelectorAll('audio[id^="audio-"]').forEach(el => {
      try { (el as any).setSinkId(selectedSpeaker) } catch {}
    })
  }, [selectedSpeaker])

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setAudioDevices(devices)
      const mic = devices.find(d => d.kind === 'audioinput')
      const spk = devices.find(d => d.kind === 'audiooutput')
      if (mic) setSelectedMic(mic.deviceId)
      if (spk) setSelectedSpeaker(spk.deviceId)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    fetchServers()
  }, [user])

  useEffect(() => {
    if (!socket) return

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('voice:participants', (participants: VoiceParticipant[]) => {
      const withSpeaking = participants.map(p => ({
        ...p,
        speaking: (p as any).speaking ?? false
      }))
      setVoiceParticipants(withSpeaking)
      if (!user || !localStreamRef.current) return
      for (const p of withSpeaking) {
        if (p.userId !== user.id && !peersRef.current.has(p.userId)) {
          createOfferTo(p.userId).catch(() => {})
        }
      }
    })

    socket.on('voice:user-joined', ({ userId: uid, username: uname }) => {
      setVoiceParticipants(prev => {
        if (prev.find(p => p.userId === uid)) return prev
        return [...prev, { userId: uid, username: uname, muted: false, deafened: false, speaking: false }]
      })
      if (!user || !localStreamRef.current || uid === user.id) return
      createOfferTo(uid).catch(() => {})
    })

    socket.on('voice:user-left', (uid: string) => {
      setVoiceParticipants(prev => prev.filter(p => p.userId !== uid))
      const peer = peersRef.current.get(uid)
      if (peer) { peer.close(); peersRef.current.delete(uid) }
      document.getElementById(`audio-${uid}`)?.remove()
    })

    socket.on('voice:offer', ({ from: fromId, offer }) => {
      if (!user || !localStreamRef.current) return
      ;(async () => {
        try {
          const pc = createPeer(fromId, localStreamRef.current!)
          await pc.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('voice:answer', { to: fromId, answer })
        } catch {}
      })()
    })

    socket.on('voice:answer', ({ from: fromId, answer }) => {
      const pc = peersRef.current.get(fromId)
      if (!pc || pc.remoteDescription?.type !== 'offer') return
      try { pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {}) } catch {}
    })

    socket.on('voice:ice-candidate', ({ from: fromId, candidate }) => {
      const pc = peersRef.current.get(fromId)
      if (pc) try { pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {}) } catch {}
    })

    socket.on('voice:speaking', ({ userId: uid, speaking }) => {
      setVoiceParticipants(prev => prev.map(p => p.userId === uid ? { ...p, speaking } : p))
    })

    return () => {
      socket.off('chat:message'); socket.off('voice:user-joined'); socket.off('voice:user-left')
      socket.off('voice:participants'); socket.off('voice:offer'); socket.off('voice:answer')
      socket.off('voice:ice-candidate'); socket.off('voice:speaking')
    }
  }, [socket, user])

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
    setActiveChannel(channelId); setMessages([])
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
    await supabase.from('chat_server_members').insert({ server_id: server.id, user_id: user.id })
    await supabase.from('chat_channels').insert([
      { server_id: server.id, name: 'genel', type: 'text' },
      { server_id: server.id, name: 'Sesli 1', type: 'voice' },
    ])
    setServers(prev => [...prev, server])
    emitToast('Sunucu oluşturuldu: ' + server.name, 'success')
    return server
  }, [user])

  const joinServer = useCallback(async (serverId: string) => {
    if (!user) return
    await supabase.from('chat_server_members').insert({ server_id: serverId, user_id: user.id })
    fetchServers()
  }, [user])

  const joinVoice = useCallback(async (channelId: string) => {
    if (!socket || !user) return
    try {
      const constraints: any = { audio: true }
      if (selectedMic) constraints.audio = { deviceId: { exact: selectedMic } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      startSpeakingDetection(channelId, stream)
    } catch { emitToast('Mikrofona erişilemedi', 'error'); return }
    voiceChannelIdRef.current = channelId
    setVoiceChannelId(channelId); setInVoice(true)
    socket.emit('voice:join', { channelId })
  }, [socket, user, selectedMic])

  const leaveVoice = useCallback(() => {
    if (!socket) return
    socket.emit('voice:leave')
    peersRef.current.forEach(peer => peer.close()); peersRef.current.clear()
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
    document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove())
    stopSpeakingDetection()
    voiceChannelIdRef.current = null
    setInVoice(false); setVoiceChannelId(null); setVoiceParticipants([]); setIsScreenSharing(false)
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
      for (const [, pc] of peersRef.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) try { await sender.replaceTrack(null) } catch {}
      }
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
      setIsScreenSharing(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      setIsScreenSharing(true)
      for (const [, pc] of peersRef.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(stream.getVideoTracks()[0])
        else pc.addTrack(stream.getVideoTracks()[0], stream)
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { toggleScreenShare() })
    } catch {}
  }, [isScreenSharing])

  const changeMic = useCallback(async (deviceId: string) => {
    setSelectedMic(deviceId)
    if (!inVoice) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } })
      const newTrack = stream.getAudioTracks()[0]
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.stop(); localStreamRef.current?.removeTrack(t) })
        localStreamRef.current.addTrack(newTrack)
      }
      for (const [, pc] of peersRef.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
        if (sender) await sender.replaceTrack(newTrack)
      }
    } catch { emitToast('Mikrofon değiştirilemedi', 'error') }
  }, [inVoice])

  const togglePushToTalk = useCallback(() => {
    setPushToTalk(prev => {
      if (prev) {
        if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true)
        setPttHeld(false)
      }
      return !prev
    })
  }, [])

  const handlePttKey = useCallback((pressed: boolean) => {
    if (!pushToTalk || !localStreamRef.current) return
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = pressed)
    setPttHeld(pressed)
  }, [pushToTalk])

  return {
    servers, channels, messages, activeChannel, setActiveChannel, setMessages,
    voiceParticipants, inVoice, voiceChannelId, isScreenSharing, localMuted,
    audioDevices, selectedMic, selectedSpeaker,
    setSelectedSpeaker, changeMic,
    fetchServers, fetchChannels, selectChannel, sendMessage, createServer, joinServer,
    joinVoice, leaveVoice, toggleMute, toggleScreenShare,
    pushToTalk, togglePushToTalk, pttHeld, handlePttKey,
  }
}
