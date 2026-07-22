import { useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'

export function useDiscordRPC() {
  const currentSong = useStore((s) => s.currentSong)
  const isPlaying = useStore((s) => s.isPlaying)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  function sendUpdate() {
    const api = (window as any).electronAPI
    if (!api?.updateDiscordPresence) return
    api.updateDiscordPresence({
      title: currentSong?.title,
      artist: currentSong?.artist,
      coverUrl: currentSong?.cover_url || '',
      isPlaying,
      currentTime: audioEngine.getCurrentTime() || 0,
      duration: currentSong?.duration || 0,
    })
  }

  useEffect(() => {
    sendUpdate()
  }, [currentSong?.id, isPlaying])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (isPlaying && currentSong) {
      timerRef.current = setInterval(sendUpdate, 10000)
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined } }
  }, [isPlaying, currentSong?.id])
}
