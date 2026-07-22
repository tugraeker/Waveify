import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return

      const state = useStore.getState()

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (state.isPlaying) {
            audioEngine.pause()
            state.setIsPlaying(false)
          } else {
            audioEngine.resume()
            state.setIsPlaying(true)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (state.currentSong) {
            const t = Math.min(audioEngine.getCurrentTime() + 5, audioEngine.getDuration())
            audioEngine.seek(t)
            state.setCurrentTime(t)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (state.currentSong) {
            const t = Math.max(audioEngine.getCurrentTime() - 5, 0)
            audioEngine.seek(t)
            state.setCurrentTime(t)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          const newVol = Math.min(state.volume + 0.1, 1)
          audioEngine.setVolume(newVol)
          state.setVolume(newVol)
          break
        case 'ArrowDown':
          e.preventDefault()
          const newVolD = Math.max(state.volume - 0.1, 0)
          audioEngine.setVolume(newVolD)
          state.setVolume(newVolD)
          break
        case 'KeyN':
          if (state.queue.length > 0) {
            const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
            const next = state.queue[idx + 1] || state.queue[0]
            if (next) state.setCurrentSong(next)
          }
          break
        case 'KeyP':
          if (state.queue.length > 0) {
            const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
            const prev = state.queue[idx - 1] || state.queue[state.queue.length - 1]
            if (prev) state.setCurrentSong(prev)
          }
          break
        case 'KeyS':
          state.setShuffle(!state.shuffle)
          break
        case 'KeyR':
          state.setRepeat(state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off')
          break
        case 'KeyL':
          e.preventDefault()
          if (state.currentSong) {
            const btn = document.querySelector('[data-like-btn]') as HTMLButtonElement
            btn?.click()
          }
          break
        case 'KeyF':
          e.preventDefault()
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
          searchInput?.focus()
          break
        case 'Escape':
          const activeSearch = document.querySelector<HTMLInputElement>('[data-search-input]:focus')
          if (activeSearch) { activeSearch.blur(); activeSearch.value = ''; state.setSearchQuery('') }
          break
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
          const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
          const idxRate = parseInt(e.key) - 1
          if (idxRate >= 0 && idxRate < rates.length) {
            audioEngine.setPlaybackRate(rates[idxRate])
            state.setPlaybackRate(rates[idxRate])
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
