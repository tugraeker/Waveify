import { useEffect, useRef } from 'react'
import { useStore } from '@/store/store'
import { useAudio } from '@/hooks/useAudio'
import { emitToast } from '@/hooks/useToast'

// Web Speech API interface definitions
interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export function useVoiceCommands(enabled: boolean = false) {
  const { togglePlay, nextSong, prevSong, volume } = useAudio()
  const { setVolume, currentSong, user } = useStore()
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (!enabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser environment.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'tr-TR'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastIndex = event.results.length - 1
      const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase()
      console.log('[VoiceCommand] Transcript:', transcript)

      // Komut eşleştirmeleri
      if (transcript.includes('dur') || transcript.includes('durdur') || transcript.includes('bekle')) {
        togglePlay()
        emitToast('🎤 Sesli Komut: Duraklatıldı', 'info')
      } else if (
        transcript.includes('çal') ||
        transcript.includes('devam') ||
        transcript.includes('oynat') ||
        transcript.includes('başlat')
      ) {
        togglePlay()
        emitToast('🎤 Sesli Komut: Çalınıyor', 'info')
      } else if (transcript.includes('sonraki') || transcript.includes('geç') || transcript.includes('ileri')) {
        nextSong()
        emitToast('🎤 Sesli Komut: Sonraki Şarkı', 'info')
      } else if (transcript.includes('önceki') || transcript.includes('geri')) {
        prevSong()
        emitToast('🎤 Sesli Komut: Önceki Şarkı', 'info')
      } else if (transcript.includes('sesi aç') || transcript.includes('ses aç')) {
        const newVol = Math.min(1, volume + 0.15)
        setVolume(newVol)
        emitToast(`🎤 Ses Seviyesi: %${Math.round(newVol * 100)}`, 'info')
      } else if (transcript.includes('sesi kıs') || transcript.includes('ses kıs')) {
        const newVol = Math.max(0, volume - 0.15)
        setVolume(newVol)
        emitToast(`🎤 Ses Seviyesi: %${Math.round(newVol * 100)}`, 'info')
      } else if (transcript.includes('beğen') || transcript.includes('kalp')) {
        if (currentSong && user) {
          import('@/lib/likes').then(({ writeLike, bumpLikeCount }) => {
            writeLike(user.id, currentSong.id, false).then((ok) => {
              if (ok) {
                bumpLikeCount(currentSong.id, currentSong.likes_count, 1)
                emitToast('🎤 Sesli Komut: Şarkı Beğenildi ❤️', 'success')
              }
            })
          })
        }
      }
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Abort veya no-speech normal durumlardır
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[VoiceCommand] Speech recognition error:', e.error)
      }
    }

    recognition.onend = () => {
      // Sürekli dinleme modu açıksa yeniden başlat
      if (enabled) {
        try {
          recognition.start()
        } catch {}
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.warn('Voice command auto-start failed:', err)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [enabled, togglePlay, nextSong, prevSong, volume, setVolume, currentSong, user])
}
