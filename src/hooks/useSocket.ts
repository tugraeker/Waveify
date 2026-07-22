import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/store/store'
import type { Song } from '@/types'

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user, setSyncRoom, syncRoom } = useStore()
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!user) return
    const currentUser = user

    function connect() {
      const s = io(SOCKET_URL, {
        auth: { userId: currentUser.id, username: currentUser.username },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      })

      s.on('connect', () => {
        console.log('[Socket] Connected')
        setConnected(true)
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = undefined
        }
      })

      s.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
        setConnected(false)
      })

      s.on('connect_error', (err) => {
        console.log('[Socket] Connection error:', err.message)
      })

      s.on('room:updated', (room) => setSyncRoom(room))
      s.on('room:closed', () => setSyncRoom(null))
      s.on('error', (msg) => console.error('[Socket] Server error:', msg))

      setSocket(s)
      return s
    }

    const s = connect()

    return () => {
      s.close()
      setSyncRoom(null)
    }
  }, [user?.id])

  const createRoom = useCallback((name: string) => {
    socket?.emit('room:create', { name })
  }, [socket])

  const joinRoom = useCallback((roomId: string) => {
    socket?.emit('room:join', { roomId })
  }, [socket])

  const leaveRoom = useCallback(() => {
    socket?.emit('room:leave')
    setSyncRoom(null)
  }, [socket])

  const playInRoom = useCallback((song: Song) => {
    socket?.emit('room:play', { song })
  }, [socket])

  const seekInRoom = useCallback((time: number) => {
    socket?.emit('room:seek', { time })
  }, [socket])

  const pauseInRoom = useCallback(() => {
    socket?.emit('room:pause')
  }, [socket])

  const resumeInRoom = useCallback(() => {
    socket?.emit('room:resume')
  }, [socket])

  return { socket, connected, createRoom, joinRoom, leaveRoom, playInRoom, seekInRoom, pauseInRoom, resumeInRoom, syncRoom }
}
