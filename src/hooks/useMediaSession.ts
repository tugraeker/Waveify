import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'

export function useMediaSession() {
  const currentSong = useStore((s) => s.currentSong)
  const isPlaying = useStore((s) => s.isPlaying)

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!currentSong) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || '',
      artwork: currentSong.cover_url ? [{ src: currentSong.cover_url, sizes: '512x512', type: 'image/jpeg' }] : [],
    })
  }, [currentSong?.id, currentSong?.title, currentSong?.artist, currentSong?.album, currentSong?.cover_url])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => {
      audioEngine.resume()
      useStore.getState().setIsPlaying(true)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioEngine.pause()
      useStore.getState().setIsPlaying(false)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const state = useStore.getState()
      if (state.queue.length === 0) return
      const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
      const prev = state.queue[idx - 1] || state.queue[state.queue.length - 1]
      if (prev) state.setCurrentSong(prev)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const state = useStore.getState()
      if (state.queue.length === 0) return
      const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
      const next = state.queue[idx + 1] || state.queue[0]
      if (next) state.setCurrentSong(next)
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) {
        audioEngine.seek(details.seekTime)
        useStore.getState().setCurrentTime(details.seekTime)
      }
    })
  }, [])
}
