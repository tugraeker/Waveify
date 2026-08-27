import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { audioEngine } from '@/lib/audioEngine'

export const HOTKEY_ACTIONS: { action: string; label: string }[] = [
  { action: 'playpause', label: 'Oynat / Duraklat' },
  { action: 'next', label: 'Sonraki Şarkı' },
  { action: 'prev', label: 'Önceki Şarkı' },
  { action: 'volumeup', label: 'Sesi Aç' },
  { action: 'volumedown', label: 'Sesi Kıs' },
  { action: 'mute', label: 'Sessize Al' },
  { action: 'shuffle', label: 'Karıştır' },
  { action: 'repeat', label: 'Tekrarla' },
]

export const DEFAULT_HOTKEYS: Record<string, string> = {
  Space: 'playpause', ArrowRight: 'next', ArrowLeft: 'prev',
  ArrowUp: 'volumeup', ArrowDown: 'volumedown', KeyM: 'mute',
  KeyN: 'shuffle', KeyR: 'repeat',
}

export function hotkeyLabel(code: string): string {
  const map: Record<string, string> = {
    Space: 'Boşluk', ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓',
  }
  if (map[code]) return map[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return

      const state = useStore.getState()

      const action = state.hotkeys[e.code]
      if (action) {
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
        switch (action) {
          case 'playpause':
            if (state.isPlaying) { audioEngine.pause(); state.setIsPlaying(false) }
            else { audioEngine.resume(); state.setIsPlaying(true) }
            break
          case 'next':
            if (state.queue.length > 0) {
              const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
              const next = state.queue[idx + 1] || state.queue[0]
              if (next) state.setCurrentSong(next)
            }
            break
          case 'prev':
            if (state.queue.length > 0) {
              const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
              const prev = state.queue[idx - 1] || state.queue[state.queue.length - 1]
              if (prev) state.setCurrentSong(prev)
            }
            break
          case 'volumeup':
            e.preventDefault()
            const nv = Math.min(state.volume + 0.1, 1)
            audioEngine.setVolume(nv)
            state.setVolume(nv)
            break
          case 'volumedown':
            e.preventDefault()
            const nvd = Math.max(state.volume - 0.1, 0)
            audioEngine.setVolume(nvd)
            state.setVolume(nvd)
            break
          case 'mute':
            const nvm = state.volume > 0 ? 0 : 0.7
            audioEngine.setVolume(nvm)
            state.setVolume(nvm)
            break
          case 'shuffle':
            state.setShuffle(!state.shuffle)
            break
          case 'repeat':
            state.setRepeat(state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off')
            break
        }
      }

      switch (e.code) {
        case 'ArrowRight':
          if (!state.hotkeys.ArrowRight) {
            e.preventDefault()
            if (state.currentSong) {
              const t = Math.min(audioEngine.getCurrentTime() + 5, audioEngine.getDuration())
              audioEngine.seek(t)
              state.setCurrentTime(t)
            }
          }
          break
        case 'ArrowLeft':
          if (!state.hotkeys.ArrowLeft) {
            e.preventDefault()
            if (state.currentSong) {
              const t = Math.max(audioEngine.getCurrentTime() - 5, 0)
              audioEngine.seek(t)
              state.setCurrentTime(t)
            }
          }
          break
        case 'KeyP':
          if (!state.hotkeys.KeyP && state.queue.length > 0) {
            const idx = state.queue.findIndex((s) => s.id === state.currentSong?.id)
            const prev = state.queue[idx - 1] || state.queue[state.queue.length - 1]
            if (prev) state.setCurrentSong(prev)
          }
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
