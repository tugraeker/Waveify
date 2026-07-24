import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import { supabase } from '@/lib/supabase'
import { trackListen, updateStreak } from '@/lib/achievements'
import type { Song } from '@/types'

export function useAudio() {
  const {
    currentSong, isPlaying, currentTime, volume,
    shuffle, repeat, queue, equalizer, sleepTimer,
    setIsPlaying, setCurrentTime, setCurrentSong, addToHistory,
  } = useStore()

  const [duration, setDuration] = useState(0)
  const [analyserData, setAnalyserData] = useState<Uint8Array>(new Uint8Array(128))
  const intervalRef = useRef<number>(0)
  const prevSongId = useRef<string | undefined>(undefined)

  // Global callbacks
  useEffect(() => {
    audioEngine.setOnTimeupdate((t) => {
      setCurrentTime(t)
    })
    audioEngine.setOnEnded(() => {
      const state = useStore.getState()
      const { queue: q, currentSong: cs, shuffle: sh, repeat: rp, sleepTimer: st } = state
      console.log('[onEnded] repeat:', rp, 'queue:', q.length, 'song:', cs?.title, 'audio_url:', cs?.audio_url)
      if (st.active && st.endOfSong) {
        audioEngine.pause()
        state.setIsPlaying(false)
        state.setSleepTimer({ remaining: 0, endOfSong: false, active: false })
        return
      }
      if (q.length === 0) return
      if (rp === 'one' && cs?.audio_url) {
        console.log('[onEnded] repeat-one, replaying')
        audioEngine.play(cs.audio_url)
        state.setIsPlaying(true)
        state.setCurrentTime(0)
        return
      }
      const ci = q.findIndex((s) => s.id === cs?.id)
      let ni = ci + 1
      if (sh) {
        ni = Math.floor(Math.random() * q.length)
      } else if (ni >= q.length) {
        if (rp === 'all') ni = 0
        else return
      }
      const nextSong = q[ni]
      if (nextSong) {
        state.setCurrentSong(nextSong)
        state.addToHistory(nextSong)
      }
    })
  }, [])

  // Play when song changes
  useEffect(() => {
    if (!currentSong || !currentSong.audio_url) return
    if (prevSongId.current === currentSong.id && audioEngine.isPlaying()) return
    prevSongId.current = currentSong.id
    const state = useStore.getState()
    if (state.crossfade && state.isPlaying && audioEngine.isPlayingState) {
      audioEngine.crossfade(currentSong.audio_url, state.crossfadeDuration || 3)
    } else {
      audioEngine.play(currentSong.audio_url)
    }
    setIsPlaying(true)
    setDuration(currentSong.duration || 0)
    setCurrentTime(0)
    addToHistory(currentSong)
    trackListen()
    updateStreak()
    if (state.user) {
      Promise.all([
        supabase.from('listen_history').insert({ user_id: state.user!.id, song_id: currentSong.id }),
        supabase.from('activities').insert({ user_id: state.user!.id, type: 'listen', data: { song_id: currentSong.id } }),
      ])
    }
  }, [currentSong?.id])

  // Volume
  useEffect(() => { audioEngine.setVolume(volume) }, [volume])

  // Equalizer
  useEffect(() => {
    const id = setTimeout(() => audioEngine.applyEqualizer(equalizer), 50)
    return () => clearTimeout(id)
  }, [equalizer])

  // Analyser data polling
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setAnalyserData(audioEngine.getAnalyserData())
      }, 80)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying])

  // Sleep timer (uses Date.now to survive background throttling)
  useEffect(() => {
    if (!sleepTimer.active) return
    if (sleepTimer.endOfSong) return
    if (sleepTimer.remaining <= 0) return
    const startedAt = Date.now()
    const startedRemaining = sleepTimer.remaining
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const newRemaining = Math.max(0, startedRemaining - elapsed)
      const state = useStore.getState()
      if (!state.sleepTimer.active) return
      if (newRemaining <= 0) {
        audioEngine.pause()
        state.setIsPlaying(false)
        state.setSleepTimer({ remaining: 0, endOfSong: false, active: false })
      } else {
        state.setSleepTimer({ ...state.sleepTimer, remaining: newRemaining })
      }
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sleepTimer.active, sleepTimer.endOfSong])

  const togglePlay = useCallback(() => {
    if (isPlaying) { audioEngine.pause(); setIsPlaying(false) }
    else { audioEngine.resume(); setIsPlaying(true) }
  }, [isPlaying, setIsPlaying])

  const playSong = useCallback((song: Song) => {
    setCurrentSong(song)
  }, [setCurrentSong])

  const seek = useCallback((time: number) => {
    if (isNaN(time) || time < 0) return
    audioEngine.seek(time)
    setCurrentTime(time)
  }, [setCurrentTime])

  const nextSong = useCallback(() => {
    if (queue.length === 0) return
    const ci = queue.findIndex((s) => s.id === currentSong?.id)
    let ni = ci + 1
    if (shuffle) { ni = Math.floor(Math.random() * queue.length) }
    else if (ni >= queue.length) { if (repeat === 'all') ni = 0; else return }
    setCurrentSong(queue[ni])
  }, [queue, currentSong?.id, shuffle, repeat, setCurrentSong])

  const prevSong = useCallback(() => {
    if (queue.length === 0) return
    const ci = queue.findIndex((s) => s.id === currentSong?.id)
    if (currentTime > 3) { seek(0); return }
    const pi = ci - 1
    if (pi < 0) { if (repeat === 'all') setCurrentSong(queue[queue.length - 1]); return }
    setCurrentSong(queue[pi])
  }, [queue, currentSong?.id, currentTime, repeat, setCurrentSong, seek])

  return {
    isPlaying, currentTime, duration, volume,
    shuffle, repeat, togglePlay, playSong,
    seek, nextSong, prevSong, analyserData,
  }
}