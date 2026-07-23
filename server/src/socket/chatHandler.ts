import { Server, Socket } from 'socket.io'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kjyjjqxqsbmrravhcuoc.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqeWpqcXhxc2JtcnJhdmhjdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzUwNDgsImV4cCI6MjEwMDE1MTA0OH0.fB6dlkOcT-fPW6bsTvwj0XnbUbLiKmhzz4LxQ8r28g8'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface VoiceParticipant {
  userId: string
  username: string
  muted: boolean
  deafened: boolean
}

const voiceState = new Map<string, Map<string, VoiceParticipant>>()

export function setupChatHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth.userId as string
    const username = socket.handshake.auth.username as string
    if (!userId) return

    let currentChannel: string | null = null

    socket.on('chat:send', async ({ channelId, content }: { channelId: string; content: string }) => {
      if (!channelId || !content?.trim()) return
      const msg = { channel_id: channelId, user_id: userId, content: content.trim() }
      const { data } = await supabase.from('chat_messages').insert(msg).select('*, user:users(username, avatar_url)').single()
      if (data) {
        io.to(`chat:${channelId}`).emit('chat:message', data)
      }
    })

    socket.on('chat:join', (channelId: string) => {
      if (currentChannel) socket.leave(`chat:${currentChannel}`)
      currentChannel = channelId
      socket.join(`chat:${channelId}`)
    })

    socket.on('chat:leave', () => {
      if (currentChannel) {
        socket.leave(`chat:${currentChannel}`)
        currentChannel = null
      }
    })

    socket.on('voice:join', ({ channelId }: { channelId: string }) => {
      if (!voiceState.has(channelId)) voiceState.set(channelId, new Map())
      voiceState.get(channelId)!.set(userId, { userId, username, muted: false, deafened: false })
      socket.join(`voice:${channelId}`)
      socket.to(`voice:${channelId}`).emit('voice:user-joined', { userId, username })
      io.to(`voice:${channelId}`).emit('voice:participants', Array.from(voiceState.get(channelId)!.values()))
    })

    socket.on('voice:leave', () => {
      for (const [chId, participants] of voiceState) {
        if (participants.has(userId)) {
          participants.delete(userId)
          if (participants.size === 0) voiceState.delete(chId)
          else io.to(`voice:${chId}`).emit('voice:participants', Array.from(participants.values()))
          socket.to(`voice:${chId}`).emit('voice:user-left', userId)
          socket.leave(`voice:${chId}`)
          break
        }
      }
    })

    socket.on('voice:offer', ({ to, offer }: { to: string; offer: any }) => {
      socket.to(`user:${to}`).emit('voice:offer', { from: userId, offer })
    })

    socket.on('voice:answer', ({ to, answer }: { to: string; answer: any }) => {
      socket.to(`user:${to}`).emit('voice:answer', { from: userId, answer })
    })

    socket.on('voice:ice-candidate', ({ to, candidate }: { to: string; candidate: any }) => {
      socket.to(`user:${to}`).emit('voice:ice-candidate', { from: userId, candidate })
    })

    socket.on('voice:toggle-mute', ({ channelId, muted }: { channelId: string; muted: boolean }) => {
      const p = voiceState.get(channelId)?.get(userId)
      if (p) { p.muted = muted; io.to(`voice:${channelId}`).emit('voice:participants', Array.from(voiceState.get(channelId)!.values())) }
    })

    socket.on('disconnect', () => {
      if (currentChannel) socket.leave(`chat:${currentChannel}`)
      for (const [chId, participants] of voiceState) {
        if (participants.has(userId)) {
          participants.delete(userId)
          if (participants.size === 0) voiceState.delete(chId)
          else io.to(`voice:${chId}`).emit('voice:participants', Array.from(participants.values()))
          socket.to(`voice:${chId}`).emit('voice:user-left', userId)
          break
        }
      }
    })
  })
}
