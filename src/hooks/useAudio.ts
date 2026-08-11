import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import { supabase } from '@/lib/supabase'
import { trackListen, trackRadioPlay, trackEffectsUse, updateStreak, awardXp, trackFullListen } from '@/lib/achievements'
import { fetchRadioBatch } from '@/lib/radio'
import { resolveAudioUrl } from '@/lib/offline'
import { emitToast } from '@/hooks/useToast'
import type { Song } from '@/types'

// Hype: Combo burst — quick song changes build a combo
let lastTrackAt = 0
let comboCount = 1
function bumpCombo() {
  const now = Date.now()
  if (now - lastTrackAt < 12000 && lastTrackAt > 0) {
    comboCount += 1
  } else {
    comboCount = 1
  }
  lastTrackAt = now
  return comboCount
}

function smartShufflePick(list: Song[], current: Song | null, excludeArtist: string[]): Song {
  const candidates = list.filter((s) => !excludeArtist.includes(s.artist))
  if (candidates.length === 0) return list[Math.floor(Math.random() * list.length)]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function useAudio() {
  const {
    currentSong, isPlaying, currentTime, volume,
    shuffle, repeat, queue, equalizer, audioEffects, playbackRate, sleepTimer, normalize,
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
      const { queue: q, currentSong: cs, shuffle: sh, repeat: rp, sleepTimer: st, smartShuffle } = state
      if (cs) trackFullListen()
      if (st.active && st.endOfSong) {
        audioEngine.pause()
        state.setIsPlaying(false)
        state.setSleepTimer({ remaining: 0, endOfSong: false, active: false })
        return
      }
      if (q.length === 0) {
        /* 130 — Sonsuz Akış: kuyruk bitince aynı ruh halindeki şarkıları otomatik çek */
        if (cs) {
          fetchRadioBatch(cs, []).then((batch) => {
            const st2 = useStore.getState()
            if (batch.length > 0) {
              st2.setQueue(batch)
              const first = batch[0]
              st2.setCurrentSong(first)
              st2.addToHistory(first)
            }
          }).catch(() => {})
        }
        return
      }
      if (rp === 'one' && cs?.audio_url) {
        audioEngine.play(cs.audio_url)
        state.setIsPlaying(true)
        state.setCurrentTime(0)
        return
      }
      const ci = q.findIndex((s) => s.id === cs?.id)
      let ni = ci + 1
      if (sh) {
        if (smartShuffle) {
          const recentArtists = q.slice(Math.max(0, ni - 2), ni).map((s) => s.artist)
          const next = smartShufflePick(q, cs, recentArtists)
          const idx = q.findIndex((s) => s.id === next.id)
          if (idx >= 0) ni = idx
          else ni = Math.floor(Math.random() * q.length)
        } else {
          ni = Math.floor(Math.random() * q.length)
        }
      } else if (ni >= q.length) {
        if (rp === 'all') ni = 0
        else if (state.radio.active && cs) {
          fetchRadioBatch(cs, q.map((s) => s.id)).then((batch) => {
            const st2 = useStore.getState()
            if (batch.length > 0) {
              st2.setQueue([...st2.queue, ...batch])
              const first = batch[0]
              st2.setCurrentSong(first)
              st2.addToHistory(first)
            } else {
              st2.setRadio({ active: false, seedId: null })
            }
          }).catch(() => {})
          return
        } else return
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
    if (audioEngine.currentUrl === currentSong.audio_url) {
      setDuration(currentSong.duration || 0)
      setIsPlaying(audioEngine.isPlaying())
      return
    }
    prevSongId.current = currentSong.id
    const state = useStore.getState()
    ;(async () => {
      let url = currentSong.audio_url
      url = await resolveAudioUrl(url)
      if (state.crossfade && state.isPlaying && audioEngine.isPlayingState) {
        audioEngine.crossfade(url, state.crossfadeDuration || 3)
      } else {
        audioEngine.play(url)
      }
    })()
    audioEngine.setPlaybackRate(state.playbackRate)
    setIsPlaying(true)
    setDuration(currentSong.duration || 0)
    setCurrentTime(0)
    addToHistory(currentSong)
    trackListen()
    if (state.audioEffects.bass > 0 || state.audioEffects.reverb > 0 || state.audioEffects.spatial > 0) {
      trackEffectsUse()
    }
    if (state.radio.active) {
      trackRadioPlay()
    }
    updateStreak()
    awardXp(1)
    if (state.user) {
      supabase.from('listen_history').insert({ user_id: state.user!.id, song_id: currentSong.id }).then(() => {}, () => {})
    }
    // Song serenade: every 5th play of the same song
    try {
      const counts = JSON.parse(localStorage.getItem('waveify_song_plays') || '{}')
      counts[currentSong.id] = (counts[currentSong.id] || 0) + 1
      const n = counts[currentSong.id]
      localStorage.setItem('waveify_song_plays', JSON.stringify(counts))
      if (n > 0 && n % 5 === 0) {
        setTimeout(() => emitToast(`🎵 Bu şarkıyla ${n}. buluşman — anılar canlanıyor`, 'info'), 900)
      }
    } catch {}
    // Combo burst: quick song changes build a combo
    const combo = bumpCombo()
    if (combo >= 3 && combo % 2 === 1) {
      setTimeout(() => emitToast(`🔥 ${combo} combo! Serin tutuyorsun`, 'info'), 500)
    }
  }, [currentSong?.id])

  // Volume
  useEffect(() => { audioEngine.setVolume(volume) }, [volume])

  // Normalization
  useEffect(() => { audioEngine.setNormalize(normalize) }, [normalize])

  // Effects
  useEffect(() => {
    const id = setTimeout(() => audioEngine.setEffects(audioEffects), 50)
    return () => clearTimeout(id)
  }, [audioEffects])

  // Playback rate
  useEffect(() => { audioEngine.setPlaybackRate(playbackRate) }, [playbackRate])

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
        if (state.sleepTimer.fadeOut) audioEngine.setVolume(useStore.getState().volume)
      } else {
        /* 106 — Gelişmiş Zamanlayıcı: son 30 saniyede sesi yumuşakça kıs */
        if (state.sleepTimer.fadeOut && newRemaining <= 30 && !state.sleepTimer.endOfSong) {
          audioEngine.setVolume(Math.max(0.03, state.volume * (newRemaining / 30)))
        }
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
    try { if (typeof navigator.vibrate === 'function') navigator.vibrate(12) } catch {}
    const ci = queue.findIndex((s) => s.id === currentSong?.id)
    let ni = ci + 1
    if (shuffle) { ni = Math.floor(Math.random() * queue.length) }
    else if (ni >= queue.length) { if (repeat === 'all') ni = 0; else return }
    setCurrentSong(queue[ni])
  }, [queue, currentSong?.id, shuffle, repeat, setCurrentSong])

const prevSong = useCallback(() => {
    if (queue.length === 0) return
    try { if (typeof navigator.vibrate === 'function') navigator.vibrate(12) } catch {}
    const ci = queue.findIndex((s) => s.id === currentSong?.id)
    if (currentTime > 3) { seek(0); return }
    const pi = ci - 1
    if (pi < 0) { if (repeat === 'all') setCurrentSong(queue[queue.length - 1]); return }
    setCurrentSong(queue[pi])
  }, [queue, currentSong?.id, currentTime, repeat, setCurrentSong, seek])

  // Tray + media keys (electron)
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onGlobalPlayPause) return
    api.onGlobalPlayPause(() => {
      useStore.getState().setIsPlaying(audioEngine.isPlaying())
      togglePlay()
    })
    api.onGlobalNext(() => nextSong())
    api.onGlobalPrev(() => prevSong())
    return () => {}
  }, [togglePlay, nextSong, prevSong])

  return {
    isPlaying, currentTime, duration, volume,
    shuffle, repeat, togglePlay, playSong,
    seek, nextSong, prevSong, analyserData,
  }
}