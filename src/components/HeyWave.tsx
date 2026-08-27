import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Mic, MicOff, X, Waves, Sparkles, Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic, Radio, Send, Bot, Loader2, AlertCircle } from 'lucide-react'
import type { Song } from '@/types'

interface WaveCommand {
  intent: string
  params: Record<string, string>
}

const INTENT_PATTERNS: { pattern: RegExp; intent: string; extract?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  { pattern: /(?:çal|oynat|başlat|play)\s+(.+)/i, intent: 'play_song', extract: (m) => ({ query: m[1] }) },
  { pattern: /(?:dur|durdur|duraklat|pause|stop)/i, intent: 'pause' },
  { pattern: /(?:devam|devam et|resume|continue)/i, intent: 'resume' },
  { pattern: /(?:sonraki|next|geç|skip)/i, intent: 'next' },
  { pattern: /(?:önceki|previous|geri)/i, intent: 'previous' },
  { pattern: /(?:ses (?:aç|kıs|yükselt|azalt))\s*(\d+)?/i, intent: 'volume', extract: (m) => ({ level: m[1] || '50' }) },
  { pattern: /(?:ses (?:kapat|sessiz|mute))/i, intent: 'mute' },
  { pattern: /(?:şarkı|parça|song)\s+(?:listesi|queue|sıra)/i, intent: 'show_queue' },
  { pattern: /(?:radyo|radio)\s+(?:aç|başlat|start)/i, intent: 'start_radio' },
  { pattern: /(?:öneri|suggestion|ne çalayım|ne dinleyeyim|what should)/i, intent: 'get_suggestion' },
  { pattern: /(?:enerji|energy|enerjik|upbeat)/i, intent: 'mood_play', extract: () => ({ mood: 'energetic' }) },
  { pattern: /(?:sakin|chill|rahat|relax)/i, intent: 'mood_play', extract: () => ({ mood: 'chill' }) },
  { pattern: /(?:odak|focus|çalış|study)/i, intent: 'mood_play', extract: () => ({ mood: 'focus' }) },
  { pattern: /(?:spor|workout|egzersiz)/i, intent: 'mood_play', extract: () => ({ mood: 'workout' }) },
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

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'tr-TR'
  utterance.rate = 1.0
  utterance.pitch = 1.0
  utterance.volume = 1.0
  const voices = window.speechSynthesis.getVoices()
  const trVoice = voices.find(v => v.lang.startsWith('tr'))
  if (trVoice) utterance.voice = trVoice
  window.speechSynthesis.speak(utterance)
}

export default function HeyWave() {
  const { user, songs, setCurrentSong, setQueue, currentSong, isPlaying, setIsPlaying, volume, setVolume } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [conversation, setConversation] = useState<{ role: 'user' | 'wave'; text: string }[]>([])
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isOpeningRef = useRef(false)

  const processCommand = useCallback(async (text: string) => {
    const cmd = parseCommand(text)
    setIsThinking(true)
    setConversation(prev => [...prev, { role: 'user', text }])
    setError(null)

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

    if (ttsEnabled) {
      setTimeout(() => speak(waveResponse), 300)
    }
  }, [songs, setCurrentSong, setQueue, setIsPlaying, setVolume, ttsEnabled])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Tarayıcınız ses tanımayı desteklemiyor. Chrome kullanın.')
      return
    }

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

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setError('Mikrofon izni verilmedi. Tarayıcı ayarlarından mikrofon iznini açın.')
      } else if (event.error === 'no-speech') {
        setError('Ses algılanamadı. Tekrar deneyin.')
      }
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [processCommand])

  useEffect(() => {
    window.speechSynthesis?.getVoices()
  }, [])

  const openAssistant = () => {
    if (isOpeningRef.current) return
    isOpeningRef.current = true
    setIsOpen(true)
    setConversation([])
    setTranscript('')
    setResponse('')
    setError(null)
    setTimeout(() => { isOpeningRef.current = false }, 500)
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Ses tanıma kullanılamıyor. Chrome tarayıcısı kullanın.')
      return
    }
    setError(null)
    setIsListening(true)
    setTranscript('')
    setResponse('')
    try { recognitionRef.current.start() } catch (e) {
      setError('Mikrofon başlatılamadı. Tekrar deneyin.')
      setIsListening(false)
    }
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
        onClick={openAssistant}
        className="fixed bottom-24 right-6 z-50 group"
        title="Hey Wave - Sesli Asistan"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] text-white shadow-lg shadow-[#8b5cf6]/30 flex items-center justify-center hover:scale-110 transition-all active:scale-95">
            <Waves size={24} className="group-hover:animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-[#0a0a0a]" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-surface-800 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-surface-700">
            Hey Wave
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4">
      <div className="w-full sm:max-w-lg h-[85vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl bg-[#0a0a0a] border border-surface-800/50 shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/20">
              <Waves size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Hey Wave</h3>
              <p className="text-[11px] text-surface-400">Sesli asistanın hazır</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${ttsEnabled ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'bg-surface-800 text-surface-400'}`}
              title={ttsEnabled ? 'Sesli yanıtlar açık' : 'Sesli yanıtlar kapalı'}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button onClick={() => { setIsOpen(false); window.speechSynthesis?.cancel() }}
              className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversation.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#a855f7]/20 flex items-center justify-center border border-[#8b5cf6]/20">
                <Sparkles size={28} className="text-[#8b5cf6]" />
              </div>
              <p className="text-white text-sm font-medium">Merhaba! Ben Hey Wave</p>
              <p className="text-surface-400 text-xs mt-1 mb-4">Mikrofonu kullan veya yazarak komut ver</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-xs mx-auto">
                {['Şarkı çal', 'Enerjik mod', 'Sakin mod', 'Ne çalayım?'].map((hint) => (
                  <button key={hint} onClick={() => processCommand(hint)}
                    className="px-3 py-1.5 rounded-full bg-surface-800/80 border border-surface-700 text-xs text-surface-300 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-all">
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#8b5cf6] text-white rounded-br-md'
                  : 'bg-surface-800 text-surface-200 rounded-bl-md border border-surface-700/50'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-surface-800 border border-surface-700/50 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {transcript && isListening && (
            <div className="flex justify-center">
              <div className="px-4 py-2 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-sm text-[#8b5cf6] animate-pulse">
                "{transcript}"
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 border-t border-surface-800/50 flex-shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white border border-surface-700'
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={isListening ? 'Dinliyorum...' : 'Komut yaz...'}
                disabled={isListening}
                className="flex-1 bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-[#8b5cf6]/50 disabled:opacity-50"
              />
              <button type="submit" disabled={isListening}
                className="w-12 h-12 rounded-xl bg-[#8b5cf6] text-white flex items-center justify-center hover:bg-[#7c3aed] transition-colors disabled:opacity-30 flex-shrink-0">
                <Send size={18} />
              </button>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700 text-[11px] text-surface-300 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-all whitespace-nowrap">
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
