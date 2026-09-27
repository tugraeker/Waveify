import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'
import { resolveAudioUrl } from '@/lib/offline'
import { supabase } from '@/lib/supabase'
import { emitToast } from '@/hooks/useToast'
import { awardXp, trackFullListen, trackListen, trackRadioPlay, updateStreak } from '@/lib/achievements'
import { fetchRadioBatch } from '@/lib/radio'
import type { Song } from '@/types'

type NextSelection = { song: Song; index: number } | null
type PreparedTrack = { fromId: string; songId: string; song: Song; url: string; ready: boolean }

function chooseNext(state: ReturnType<typeof useStore.getState>): NextSelection {
  const { queue, currentSong, shuffle, repeat, smartShuffle } = state
  if (!queue.length) return null
  const currentIndex = queue.findIndex((song) => song.id === currentSong?.id)
  if (shuffle) {
    const candidates = queue.map((song, index) => ({ song, index })).filter(({ song }) => song.id !== currentSong?.id)
    if (!candidates.length) return repeat === 'all' ? { song: queue[0], index: 0 } : null
    const differentArtist = smartShuffle
      ? candidates.filter(({ song }) => song.artist !== currentSong?.artist)
      : candidates
    const pool = differentArtist.length ? differentArtist : candidates
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1
  if (nextIndex < queue.length) return { song: queue[nextIndex], index: nextIndex }
  if (repeat === 'all') return { song: queue[0], index: 0 }
  return null
}

function recordTrack(song: Song) {
  const state = useStore.getState()
  state.addToHistory(song)
  trackListen()
  updateStreak()
  awardXp(1)
  if (state.radio.active) trackRadioPlay()
  if (state.user) {
    void supabase.from('listen_history').insert({ user_id: state.user.id, song_id: song.id })
      .then(() => undefined, () => undefined)
  }
}

/** The app-wide owner of playback events, source loading, crossfade, and settings. */
export function useAudioController() {
  const sleepTimer = useStore((state) => state.sleepTimer)

  useEffect(() => {
    let requestId = 0
    let lastRecordedId = ''
    let activeSong = useStore.getState().currentSong
    let activeSongId = activeSong?.id || ''
    let handledEnded = false
    let fadingFromId = ''
    let crossfadeFailedFromId = ''
    let prepared: PreparedTrack | null = null
    let preparingId = ''
    let skipPlaybackId = ''

    const applySettings = (state: ReturnType<typeof useStore.getState>) => {
      audioEngine.setVolume(state.volume)
      audioEngine.setPlaybackRate(state.playbackRate)
      audioEngine.applyEqualizer(state.equalizer)
      audioEngine.setPeakProtection(state.normalize)
    }
    applySettings(useStore.getState())
    const unsubscribeStore = useStore.subscribe((state, previous) => {
      if (state.volume !== previous.volume) audioEngine.setVolume(state.volume)
      if (state.playbackRate !== previous.playbackRate) audioEngine.setPlaybackRate(state.playbackRate)
      if (state.equalizer !== previous.equalizer) audioEngine.applyEqualizer(state.equalizer)
      if (state.normalize !== previous.normalize) audioEngine.setPeakProtection(state.normalize)
    })

    const maybeCrossfade = () => {
      const state = useStore.getState()
      const current = state.currentSong
      if (!state.crossfade || !state.isPlaying || state.repeat === 'one' || !current || !audioEngine.isPlaying()) return
      if (fadingFromId === current.id || crossfadeFailedFromId === current.id) return
      const duration = audioEngine.getDuration() || state.duration || current.duration || 0
      if (duration <= 0) return
      const remaining = duration - audioEngine.getCurrentTime()
      const fadeDuration = Math.min(Math.max(state.crossfadeDuration, 0.25), Math.max(0.25, duration / 2))
      let candidate = prepared?.fromId === current.id ? prepared : null
      if (!candidate) {
        const selection = chooseNext(state)
        if (!selection || selection.song.id === current.id) return
        candidate = { fromId: current.id, songId: selection.song.id, song: selection.song, url: '', ready: false }
        prepared = candidate
      }

      if (!candidate.ready && preparingId !== candidate.songId) {
        preparingId = candidate.songId
        const pendingCandidate = candidate
        void resolveAudioUrl(candidate.song.audio_url).then(async (url) => {
          const latest = useStore.getState()
          if (prepared !== pendingCandidate || latest.currentSong?.id !== pendingCandidate.fromId) {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url)
            return
          }
          pendingCandidate.url = url
          await audioEngine.prepare(url)
          if (prepared !== pendingCandidate || useStore.getState().currentSong?.id !== pendingCandidate.fromId) {
            audioEngine.discardPrepared(url)
            return
          }
          pendingCandidate.ready = true
        }).catch(() => {
          crossfadeFailedFromId = pendingCandidate.fromId
          audioEngine.discardPrepared(pendingCandidate.url)
          if (prepared === pendingCandidate) prepared = null
        }).finally(() => {
          if (preparingId === pendingCandidate.songId) preparingId = ''
        })
      }

      if (remaining > fadeDuration + 0.2 || !candidate.ready) return
      fadingFromId = current.id
      const outgoingId = current.id
      void audioEngine.crossfade(candidate.url, fadeDuration).then(() => {
        const latest = useStore.getState()
        if (latest.currentSong?.id !== outgoingId) return
        skipPlaybackId = candidate!.songId
        latest.setCurrentTime(0)
        latest.setDuration(candidate!.song.duration || audioEngine.getDuration())
        latest.setCurrentSong(candidate!.song)
        recordTrack(candidate!.song)
        lastRecordedId = candidate!.songId
        activeSong = candidate!.song
        activeSongId = candidate!.songId
        prepared = null
        fadingFromId = ''
        crossfadeFailedFromId = ''
      }).catch((error) => {
        fadingFromId = ''
        crossfadeFailedFromId = outgoingId
        audioEngine.discardPrepared(candidate!.url)
        prepared = null
        useStore.getState().setIsBuffering(false)
        emitToast(error instanceof Error ? error.message : 'Parçalar arası geçiş yapılamadı.', 'error')
      })
    }

    const unsubscribeTime = audioEngine.on('timeupdate', (time) => {
      const state = useStore.getState()
      if (!state.isBuffering) state.setCurrentTime(time)
      maybeCrossfade()
    })
    const unsubscribeDuration = audioEngine.on('durationchange', (duration) => {
      if (duration > 0) useStore.getState().setDuration(duration)
    })
    const unsubscribePlay = audioEngine.on('play', () => {
      const state = useStore.getState()
      state.setIsPlaying(true)
      state.setIsBuffering(false)
      const duration = audioEngine.getDuration()
      if (duration > 0) state.setDuration(duration)
    })
    const unsubscribePause = audioEngine.on('pause', () => {
      useStore.getState().setIsPlaying(false)
      useStore.getState().setIsBuffering(false)
    })
    const unsubscribeWaiting = audioEngine.on('waiting', () => useStore.getState().setIsBuffering(true))
    const unsubscribeError = audioEngine.on('error', (error) => {
      useStore.getState().setIsBuffering(false)
      useStore.getState().setIsPlaying(audioEngine.isPlaying())
      emitToast(error.message || 'Ses kaynağı açılamadı.', 'error')
    })

    const advanceAtEnd = async () => {
      const state = useStore.getState()
      const current = state.currentSong
      if (handledEnded) return
      handledEnded = true
      if (current) trackFullListen()
      if (state.sleepTimer.active && state.sleepTimer.endOfSong) {
        audioEngine.pause()
        state.setSleepTimer({ remaining: 0, endOfSong: false, active: false })
        return
      }
      if (state.repeat === 'one' && current) {
        audioEngine.seek(0)
        await audioEngine.resume()
        handledEnded = false
        return
      }
      const selection = chooseNext(state)
      if (selection) {
        if (selection.song.id === current?.id) {
          audioEngine.seek(0)
          await audioEngine.resume()
          handledEnded = false
          return
        }
        state.setCurrentSong(selection.song)
        return
      }
      if ((state.radio.active || state.queue.length === 0) && current) {
        try {
          const batch = await fetchRadioBatch(current, state.queue.map((song) => song.id))
          if (batch.length) {
            const latest = useStore.getState()
            latest.setQueue(latest.queue.length ? [...latest.queue, ...batch] : batch)
            latest.setCurrentSong(batch[0])
            return
          }
          if (state.radio.active) state.setRadio({ active: false, seedId: null })
        } catch { /* Radio recommendations are optional; keep playback controls usable. */ }
      }
      state.setIsPlaying(false)
      state.setCurrentTime(audioEngine.getDuration())
    }
    const unsubscribeEnded = audioEngine.on('ended', () => { void advanceAtEnd() })

    const electron = (window as any).electronAPI
    const removeElectronListeners: Array<() => void> = []
    if (electron?.onGlobalPlayPause) {
      const remove = electron.onGlobalPlayPause(() => {
        if (audioEngine.isPlaying()) audioEngine.pause()
        else void audioEngine.resume()
      })
      if (typeof remove === 'function') removeElectronListeners.push(remove)
    }
    if (electron?.onGlobalNext) {
      const remove = electron.onGlobalNext(() => {
        const state = useStore.getState()
        const selection = chooseNext(state)
        if (!selection) return
        if (selection.song.id === state.currentSong?.id) state.requestPlayback()
        else state.setCurrentSong(selection.song)
      })
      if (typeof remove === 'function') removeElectronListeners.push(remove)
    }
    if (electron?.onGlobalPrev) {
      const remove = electron.onGlobalPrev(() => {
        const state = useStore.getState()
        if (audioEngine.getCurrentTime() > 3) {
          audioEngine.seek(0)
          state.setCurrentTime(0)
          return
        }
        const index = state.queue.findIndex((song) => song.id === state.currentSong?.id)
        const previous = state.queue[index - 1] || (state.repeat === 'all' ? state.queue[state.queue.length - 1] : null)
        if (previous?.id === state.currentSong?.id) state.requestPlayback()
        else if (previous) state.setCurrentSong(previous)
      })
      if (typeof remove === 'function') removeElectronListeners.push(remove)
    }

    const unsubscribeCurrentSong = useStore.subscribe((state, previous) => {
      if (state.currentSong?.id === previous.currentSong?.id && state.playbackRequest === previous.playbackRequest) return
      const explicitReplay = state.currentSong?.id === previous.currentSong?.id
      const song = state.currentSong
      prepared = null
      preparingId = ''
      fadingFromId = ''
      crossfadeFailedFromId = ''
      handledEnded = false
      if (!song?.audio_url) {
        ++requestId
        audioEngine.stop()
        state.setDuration(0)
        state.setCurrentTime(0)
        state.setIsPlaying(false)
        state.setIsBuffering(false)
        return
      }
      if (skipPlaybackId === song.id && state.currentSong?.id !== previous.currentSong?.id) {
        skipPlaybackId = ''
        return
      }
      if (explicitReplay) lastRecordedId = ''
      const thisRequest = ++requestId
      state.setIsBuffering(true)
      state.setCurrentTime(0)
      state.setDuration(song.duration || 0)
      const originalUrl = song.audio_url
      void resolveAudioUrl(originalUrl).then(async (url) => {
        if (thisRequest !== requestId || useStore.getState().currentSong?.id !== song.id) {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        if ((explicitReplay || (activeSongId && activeSongId !== song.id)) && audioEngine.currentUrl === url) audioEngine.seek(0)
        await audioEngine.play(url)
        if (thisRequest !== requestId || useStore.getState().currentSong?.id !== song.id) return
        if (lastRecordedId !== song.id) {
          lastRecordedId = song.id
          recordTrack(song)
        }
        activeSong = song
        activeSongId = song.id
        state.setIsPlaying(true)
        state.setIsBuffering(false)
      }).catch((error) => {
        if (thisRequest !== requestId) return
        state.setIsBuffering(false)
        if (audioEngine.isPlaying() && activeSong && activeSong.id !== song.id) {
          skipPlaybackId = activeSong.id
          useStore.getState().setCurrentSong(activeSong)
          useStore.getState().setIsPlaying(true)
        } else {
          state.setIsPlaying(audioEngine.isPlaying())
        }
        emitToast(error instanceof Error ? error.message : `“${song.title}” oynatılamadı.`, 'error')
      })
    })

    return () => {
      ++requestId
      unsubscribeStore()
      unsubscribeCurrentSong()
      unsubscribeTime()
      unsubscribeDuration()
      unsubscribePlay()
      unsubscribePause()
      unsubscribeWaiting()
      unsubscribeError()
      unsubscribeEnded()
      removeElectronListeners.forEach((remove) => remove())
    }
  }, [])

  useEffect(() => {
    if (!sleepTimer.active || sleepTimer.endOfSong || sleepTimer.remaining <= 0) return
    const startedAt = Date.now()
    const startedRemaining = sleepTimer.remaining
    const interval = window.setInterval(() => {
      const state = useStore.getState()
      if (!state.sleepTimer.active) return
      const remaining = Math.max(0, startedRemaining - Math.floor((Date.now() - startedAt) / 1000))
      if (remaining <= 0) {
        audioEngine.pause()
        state.setSleepTimer({ remaining: 0, endOfSong: false, active: false })
        if (state.sleepTimer.fadeOut) audioEngine.setVolume(state.volume)
        return
      }
      if (state.sleepTimer.fadeOut && remaining <= 30) audioEngine.setVolume(Math.max(0.03, state.volume * (remaining / 30)))
      state.setSleepTimer({ ...state.sleepTimer, remaining })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [sleepTimer.active, sleepTimer.endOfSong])
}

