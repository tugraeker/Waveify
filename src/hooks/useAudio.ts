import { useCallback } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import type { Song } from '@/types'

/** UI-facing playback state/actions. The controller itself is mounted once by App. */
export function useAudio() {
  const currentSong = useStore((state) => state.currentSong)
  const isPlaying = useStore((state) => state.isPlaying)
  const isBuffering = useStore((state) => state.isBuffering)
  const currentTime = useStore((state) => state.currentTime)
  const duration = useStore((state) => state.duration)
  const volume = useStore((state) => state.volume)
  const shuffle = useStore((state) => state.shuffle)
  const repeat = useStore((state) => state.repeat)
  const queue = useStore((state) => state.queue)
  const setCurrentSong = useStore((state) => state.setCurrentSong)
  const setCurrentTime = useStore((state) => state.setCurrentTime)

  const togglePlay = useCallback(() => {
    if (audioEngine.isPlaying()) audioEngine.pause()
    else void audioEngine.resume()
  }, [])

  const playSong = useCallback((song: Song) => {
    if (useStore.getState().currentSong?.id === song.id) {
      const state = useStore.getState()
      if (!state.isPlaying && !state.isBuffering) state.requestPlayback()
      return
    }
    setCurrentSong(song)
  }, [setCurrentSong])

  const seek = useCallback((time: number) => {
    if (!Number.isFinite(time) || time < 0) return
    const upper = useStore.getState().duration
    const target = upper > 0 ? Math.min(time, upper) : time
    audioEngine.seek(target)
    setCurrentTime(target)
  }, [setCurrentTime])

  const nextSong = useCallback(() => {
    const state = useStore.getState()
    const { queue: currentQueue, currentSong: activeSong, shuffle: isShuffle, repeat: repeatMode } = state
    if (!currentQueue.length) return
    const currentIndex = currentQueue.findIndex((song) => song.id === activeSong?.id)
    if (isShuffle) {
      const candidates = currentQueue.filter((song) => song.id !== activeSong?.id)
      if (candidates.length) state.setCurrentSong(candidates[Math.floor(Math.random() * candidates.length)])
      else if (repeatMode === 'all') state.requestPlayback()
      return
    }
    const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1
    if (nextIndex < currentQueue.length) state.setCurrentSong(currentQueue[nextIndex])
    else if (repeatMode === 'all') {
      if (currentQueue[0].id === activeSong?.id) state.requestPlayback()
      else state.setCurrentSong(currentQueue[0])
    }
  }, [])

  const prevSong = useCallback(() => {
    const state = useStore.getState()
    const { queue: currentQueue, currentSong: activeSong, repeat: repeatMode } = state
    if (!currentQueue.length) return
    if (audioEngine.getCurrentTime() > 3) {
      audioEngine.seek(0)
      setCurrentTime(0)
      return
    }
    const currentIndex = currentQueue.findIndex((song) => song.id === activeSong?.id)
    if (currentIndex > 0) state.setCurrentSong(currentQueue[currentIndex - 1])
    else if (repeatMode === 'all') {
      const previous = currentQueue[currentQueue.length - 1]
      if (previous.id === activeSong?.id) state.requestPlayback()
      else state.setCurrentSong(previous)
    }
  }, [setCurrentTime])

  const analyserData = audioEngine.getAnalyserData()
  return {
    currentSong,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    queue,
    togglePlay,
    playSong,
    seek,
    nextSong,
    prevSong,
    analyserData,
  }
}
