import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Mic, MicOff, X, Waves, Sparkles, Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic, Radio } from 'lucide-react'
import type { Song } from '@/types'

interface WaveCommand {
  intent: string
  params: Record<string, string>
}

const INTENT_PATTERNS: { pattern: RegExp; intent: string; extract?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  { pattern: /(?:çal|oynat|başlat|play)\s+(.+)/i, intent: 'play_song', extract: (m) => ({ query: m[1] }) },
  { pattern: /(?:dur|durdur|duraklat|pause|stop)/i, intent: 'pause' },
  { pattern: /(?:devam|devam et|devam et|resume|continue)/i, intent: 'resume' },
  { pattern: /(?:sonraki|next|geç|skip)/i, intent: 'next' },
  { pattern: /(?:önceki|previous|geri)/i, intent: 'previous' },
  { pattern: /(?:ses (?:aç|kıs|yükselt|azalt|yi|yi))\s*(\d+)?/i, intent: 'volume', extract: (m) => ({ level: m[1] || '50' }) },
  { pattern: /(?:ses (?:kapat|sessiz|mute))/i, intent: 'mute' },
  { pattern: /(?:şarkı|parça|song)\s+(?:listesi|queue|sıra)/i, intent: 'show_queue' },
  { pattern: /(?:radyo|radio)\s+(?:aç|başlat|start)/i, intent: 'start_radio' },
  { pattern: /(?:arkadaş|friend|davet|invite)/i, intent: 'invite_friends' },
  { pattern: /(?:parti|party|parti başlat)/i, intent: 'start_party' },
  { pattern: /(?:öneri|suggestion|ne çalayım|ne dinleyeyim|what should)/i, intent: 'get_suggestion' },
  { pattern: /(?:enerji|energy|enerjik|upbeat)/i, intent: 'mood_play', extract: () => ({ mood: 'energetic' }) },
  { pattern: /(?:sakin|chill|rahat|relax)/i, intent: 'mood_play', extract: () => ({ mood: 'chill' }) },
  { pattern: /(?:odak|focus|çalış|study)/i, intent: 'mood_play', extract: () => ({ mood: 'focus' }) },
  { pattern: /(?:spor|workout|egzersiz|exercise)/i, intent: 'mood_play', extract: () => ({ mood: 'workout' }) },
  { pattern: /(?:gece|night|uyku|sleep)/i, intent: 'mood_play', extract: () => ({ mood: 'night' }) },
]

function parseCommand(transcript: string): WaveCommand {
  const lower = transcript.toLowerCase().trim()
  for (const { pattern, intent, extract } of INTENT_PATTERNS) {
    const match = lower.match(pattern)
    if (match) {
      return { intent, params: extract ? extract(match) : {} }
    }
  }
  return { intent: 'unknown', params: { query: lower } }
}

export default function HeyWave() {
  const { user, songs, setCurrentSong, setQueue, currentSong, isPlaying, setIsPlaying, volume, setVolume } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [conversation, setConversation] = useState<{ role: 'user' | 'wave'; text: string }[]>([])
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processCommand = useCallback(async (text: string) => {
    const cmd = parseCommand(text)
    setIsThinking(true)
    setConversation(prev => [...prev, { role: 'user', text }])

    let waveResponse = ''

    switch (cmd.intent) {
      case 'play_song': {
        const query = cmd.params.query || ''
        const found = songs.find(s =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.artist.toLowerCase().includes(query.toLowerCase())
        )
        if (found) {
          setCurrentSong(found)
          setIsPlaying(true)
          waveResponse = `"${found.title}" çalınıyor 🎵`
        } else {
          waveResponse = `"${query}" bulunamadı. Farklı bir isim dene.`
        }
        break
      }
      case 'pause':
        setIsPlaying(false)
        waveResponse = 'Müzik duraklatıldı ⏸️'
        break
      case 'resume':
        setIsPlaying(true)
        waveResponse = 'Müzik devam ediyor ▶️'
        break
      case 'next':
        waveResponse = 'Sonraki şarkıya geçiliyor ⏭️'
        break
      case 'previous':
        waveResponse = 'Önceki şarkıya geçiliyor ⏮️'
        break
      case 'volume': {
        const level = parseInt(cmd.params.level || '50')
        setVolume(Math.min(100, Math.max(0, level)))
        waveResponse = `Ses %${level} ayarlandı 🔊`
        break
      }
      case 'mute':
        setVolume(0)
        waveResponse = 'Sessiz mod açıldı 🔇'
        break
      case 'show_queue':
        waveResponse = `Sırada ${songs.length} şarkı var 📋`
        break
      case 'start_radio':
        waveResponse = 'Radyo başlatılıyor 📻'
        break
      case 'invite_friends':
        waveResponse = 'Arkadaş davet linki hazırlanıyor 💌'
        break
      case 'start_party':
        waveResponse = 'Parti modu açılıyor! 🎉'
        break
      case 'get_suggestion': {
        const random = songs[Math.floor(Math.random() * songs.length)]
        if (random) {
          waveResponse = `Şu an "${random.title}" - ${random.artist} çok iyi gider! Denemek ister misin?`
        } else {
          waveResponse = 'Henüz şarkı yok. Önce bir şarkı yükle! 🎶'
        }
        break
      }
      case 'mood_play': {
        const mood = cmd.params.mood
        const moodMap: Record<string, { filter: (s: Song) => boolean; label: string }> = {
          energetic: { filter: (s) => (s.bpm || 0) > 120, label: 'Enerjik' },
          chill: { filter: (s) => (s.bpm || 0) < 100, label: 'Sakin' },
          focus: { filter: (s) => s.genre === 'classical' || s.genre === 'ambient', label: 'Odaklanma' },
          workout: { filter: (s) => (s.bpm || 0) > 130, label: 'Spor' },
          night: { filter: (s) => s.genre === 'ambient' || s.genre === 'lofi', label: 'Gece' },
        }
        const { filter, label } = moodMap[mood] || moodMap.chill
        const filtered = songs.filter(filter)
        if (filtered.length > 0) {
          setQueue(filtered)
          setCurrentSong(filtered[0])
          setIsPlaying(true)
          waveResponse = `${label} modu aktif! ${filtered.length} şarkı hazır 🎧`
        } else {
          waveResponse = `${label} için şarkı bulunamadı 😕`
        }
        break
      }
      default:
        waveResponse = `"${text}" komutunu anlayamadım. "Hey Wave, şarkı çal" gibi bir şeyler söyle! 🤔`
    }

    setResponse(waveResponse)
    setConversation(prev => [...prev, { role: 'wave', text: waveResponse }])
    setIsThinking(false)
  }, [songs, setCurrentSong, setQueue, setIsPlaying, setVolume])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'tr-TR'

    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const result = event.results[current]
      const text = result[0].transcript
      setTranscript(text)

      if (result.isFinal) {
        processCommand(text)
        setIsListening(false)
      }
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [processCommand])

  const startListening = () => {
    if (!recognitionRef.current) return
    setIsListening(true)
    setTranscript('')
    setResponse('')
    try { recognitionRef.current.start() } catch {}
  }

  const stopListening = () => {
    if (!recognitionRef.current) return
    setIsListening(false)
    try { recognitionRef.current.stop() } catch {}
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = inputRef.current
    if (!input || !input.value.trim()) return
    processCommand(input.value.trim())
    input.value = ''
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 text-white shadow-lg shadow-wave-500/30 flex items-center justify-center hover:scale-110 transition-all active:scale-95 group"
        title="Hey Wave"
      >
        <Waves size={24} className="group-hover:animate-bounce" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-900 border border-surface-700/50 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center">
              <Waves size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Hey Wave</h3>
              <p className="text-[11px] text-surface-400">Sesli asistanın hazır</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-surface-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conversation */}
        <div className="h-64 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversation.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-surface-800/80 flex items-center justify-center">
                <Sparkles size={28} className="text-wave-400" />
              </div>
              <p className="text-surface-300 text-sm font-medium">Merhaba! Ben Hey Wave</p>
              <p className="text-surface-500 text-xs mt-1">"Hey Wave, şarkı çal" de veya yaz</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {['Şarkı çal', 'Enerjik mod', 'Sakin mod', 'Ne çalayım?'].map((hint) => (
                  <button key={hint} onClick={() => processCommand(hint)}
                    className="px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700 text-xs text-surface-300 hover:border-wave-500/50 hover:text-wave-400 transition-all">
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-wave-600 text-white rounded-br-md'
                  : 'bg-surface-800 text-surface-200 rounded-bl-md border border-surface-700/50'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-surface-800 border border-surface-700/50 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-wave-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-wave-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-wave-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 border-t border-surface-800/50">
          <div className="flex items-center gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <form onSubmit={handleTextSubmit} className="flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={isListening ? 'Dinliyorum...' : 'Komut yaz...'}
                disabled={isListening}
                className="w-full bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50 disabled:opacity-50"
              />
            </form>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
            {[
              { icon: Play, label: 'Çal', cmd: 'şarkı çal' },
              { icon: Pause, label: 'Dur', cmd: 'durdur' },
              { icon: SkipForward, label: 'Sonraki', cmd: 'sonraki' },
              { icon: VolumeX, label: 'Sessiz', cmd: 'sesi kapat' },
              { icon: ListMusic, label: 'Queue', cmd: 'şarkı listesi' },
              { icon: Radio, label: 'Radyo', cmd: 'radyo aç' },
            ].map(({ icon: Icon, label, cmd }) => (
              <button key={label} onClick={() => processCommand(cmd)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700 text-[11px] text-surface-300 hover:border-wave-500/50 hover:text-wave-400 transition-all whitespace-nowrap">
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
