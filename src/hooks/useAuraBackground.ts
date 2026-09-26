import { useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { getSongAuraColor } from '@/lib/localAI'

export function useAuraBackground() {
  const currentSong = useStore((s) => s.currentSong)
  const isPlaying = useStore((s) => s.isPlaying)
  const prevColorRef = useRef<string>('#8b5cf6')

  useEffect(() => {
    const root = document.documentElement
    if (!currentSong) {
      root.style.removeProperty('--current-aura')
      root.style.removeProperty('--current-aura-dim')
      return
    }

    const aura = getSongAuraColor(currentSong)
    prevColorRef.current = aura

    // Dinamik renkler
    root.style.setProperty('--current-aura', aura)
    root.style.setProperty('--current-aura-dim', `${aura}18`)
    root.style.setProperty('--current-aura-glow', `${aura}33`)

    // Sayfa zeminine ambient aura glow efekti (hafif, şık ve göz yormayan)
    let ambientDiv = document.getElementById('waveify-ambient-aura')
    if (!ambientDiv) {
      ambientDiv = document.createElement('div')
      ambientDiv.id = 'waveify-ambient-aura'
      ambientDiv.className = 'fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000'
      ambientDiv.style.opacity = isPlaying ? '0.22' : '0.1'
      document.body.prepend(ambientDiv)
    }

    ambientDiv.style.background = `radial-gradient(circle at 85% 15%, ${aura} 0%, transparent 55%), radial-gradient(circle at 15% 85%, ${aura} 0%, transparent 50%)`
    ambientDiv.style.opacity = isPlaying ? '0.22' : '0.1'

    return () => {
      // Bileşen unmount durumunda
    }
  }, [currentSong?.id, isPlaying])
}
