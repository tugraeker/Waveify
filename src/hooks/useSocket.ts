import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/store/store'
import type { Song } from '@/types'

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let _socket: Socket | null = null
let _connected = false
let _initUserId: string | null = null

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(_socket)
  const [connected, setConnected] = useState(_connected)
  const { user, setSyncRoom, syncRoom } = useStore()

  useEffect(() => {
    if (!user) return

    // Same user, socket already exists — just use it
    if (_initUserId === user.id) {
      if (_socket && !_socket.connected) _socket.connect()
      setSocket(_socket)
      setConnected(_socket?.connected || false)
      return
    }

    // Different user — close old socket
    if (_socket) { _socket.close(); _socket = null; _initUserId = null }

    const currentUser = user

    const s = io(SOCKET_URL, {
      auth: { userId: currentUser.id, username: currentUser.username },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    s.on('connect', () => {
      _connected = true; setConnected(true)
    })

    s.on('disconnect', () => {
      _connected = false; setConnected(false)
    })

    s.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message)
    })

    s.on('room:updated', (room) => setSyncRoom(room))
    s.on('room:closed', () => setSyncRoom(null))
    s.on('error', (msg) => console.error('[Socket] Server error:', msg))

    _socket = s
    _initUserId = currentUser.id
    setSocket(s)
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
