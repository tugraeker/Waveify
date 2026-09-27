import { useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { getSongAuraColor } from '@/lib/localAI'

export function useAuraBackground() {
  const currentSong = useStore((s) => s.currentSong)
  const isPlaying = useStore((s) => s.isPlaying)
  const prevColorRef = useRef<string>('#C6FF3E')

  useEffect(() => {
    const root = document.documentElement
    if (!currentSong) {
      root.style.removeProperty('--current-aura')
      root.style.removeProperty('--current-aura-dim')
      const ambientDiv = document.getElementById('waveify-ambient-aura')
      if (ambientDiv) ambientDiv.style.opacity = '0'
      return
    }

    const aura = getSongAuraColor(currentSong)
    prevColorRef.current = aura

    root.style.setProperty('--current-aura', aura)
    root.style.setProperty('--current-aura-dim', `${aura}18`)
    root.style.setProperty('--current-aura-glow', `${aura}33`)

    let ambientDiv = document.getElementById('waveify-ambient-aura')
    if (!ambientDiv) {
      ambientDiv = document.createElement('div')
      ambientDiv.id = 'waveify-ambient-aura'
      ambientDiv.className = 'fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000'
      document.body.prepend(ambientDiv)
    }

    ambientDiv.style.background = `radial-gradient(circle at 82% 12%, ${aura} 0%, transparent 42%), radial-gradient(circle at 12% 88%, ${aura} 0%, transparent 38%)`
    ambientDiv.style.filter = 'blur(8px)'
    ambientDiv.style.opacity = isPlaying ? '0.28' : '0.12'
  }, [currentSong?.id, isPlaying])
}
