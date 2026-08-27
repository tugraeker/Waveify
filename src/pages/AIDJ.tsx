import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import type { Song } from '@/types'
import { Bot, Send, Sparkles, Music, Play, Pause, Shuffle, SkipForward, ListMusic, Heart, Zap, Moon, Sun, Coffee, Dumbbell, Headphones, Radio, Mic } from 'lucide-react'

interface Message {
  role: 'user' | 'dj'
  text: string
  songs?: Song[]
  actions?: { label: string; action: string; icon: any }[]
}

const MOODS = [
  { id: 'energetic', label: 'Enerjik', icon: Zap, color: 'from-orange-500 to-red-500', emoji: '🔥' },
  { id: 'chill', label: 'Sakin', icon: Moon, color: 'from-blue-500 to-indigo-500', emoji: '🌊' },
  { id: 'focus', label: 'Odaklanma', icon: Coffee, color: 'from-amber-500 to-yellow-500', emoji: '🎯' },
  { id: 'workout', label: 'Spor', icon: Dumbbell, color: 'from-green-500 to-emerald-500', emoji: '💪' },
  { id: 'night', label: 'Gece', icon: Headphones, color: 'from-purple-500 to-violet-500', emoji: '🌙' },
  { id: 'party', label: 'Parti', icon: Sparkles, color: 'from-pink-500 to-rose-500', emoji: '🎉' },
]

export default function AIDJ() {
  const navigate = useNavigate()
  const { user, songs, setCurrentSong, setQueue, currentSong, isPlaying, setIsPlaying } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [listeningHistory, setListeningHistory] = useState<Song[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  async function fetchHistory() {
    const { data } = await supabase
      .from('listen_history')
      .select('*, song:songs(*)')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: false })
      .limit(50)
    if (data) setListeningHistory(data.map((h: any) => h.song).filter(Boolean))
  }

  const getAIResponse = (userInput: string): Message => {
    const lower = userInput.toLowerCase()

    // Mood-based responses
    if (lower.includes('enerji') || lower.includes('enerjik') || lower.includes('upbeat')) {
      const energeticSongs = songs.filter(s => s.bpm && s.bpm > 120).slice(0, 5)
      return {
        role: 'dj',
        text: 'Enerji seviyen yüksek! İşte sana ateş gibi şarkılar 🔥',
        songs: energeticSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('sakin') || lower.includes('chill') || lower.includes('rahat')) {
      const chillSongs = songs.filter(s => s.bpm && s.bpm < 100).slice(0, 5)
      return {
        role: 'dj',
        text: 'Sakin bir vibe mı istiyorsun? İşte rahatlatıcı şarkılar 🌊',
        songs: chillSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('odak') || lower.includes('çalış') || lower.includes('focus')) {
      const focusSongs = songs.filter(s => s.genre === 'classical' || s.genre === 'ambient' || s.genre === 'instrumental').slice(0, 5)
      return {
        role: 'dj',
        text: 'Odaklanma modu aktif! Bu şarkılar konsantrasyonunu artırır 🎯',
        songs: focusSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('parti') || lower.includes('party') || lower.includes('eğlence')) {
      const partySongs = songs.filter(s => s.bpm && s.bpm > 110).slice(0, 5)
      return {
        role: 'dj',
        text: 'Parti zamanı! Bu şarkılar herkesi ayağa kaldırır 🎉',
        songs: partySongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('öner') || lower.includes('ne çal') || lower.includes('ne dinle')) {
      const randomSongs = [...songs].sort(() => Math.random() - 0.5).slice(0, 5)
      return {
        role: 'dj',
        text: 'Sana özel önerilerim! Believe in my taste ✨',
        songs: randomSongs,
        actions: [{ label: 'Karıştır', action: 'shuffle', icon: Shuffle }]
      }
    }

    if (lower.includes('karıştır') || lower.includes('shuffle') || lower.includes('rastgele')) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5).slice(0, 10)
      return {
        role: 'dj',
        text: 'Karıştır modu aktif! Rastgele şarkılar geliyor 🎲',
        songs: shuffled,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('listem') || lower.includes('şarkılarım') || lower.includes('kütüphane')) {
      return {
        role: 'dj',
        text: `Kütüphanende ${songs.length} şarkı var. Hepsi çok güzel! 📚`,
        songs: songs.slice(0, 5),
        actions: [{ label: 'Tümünü Göster', action: 'show_all', icon: ListMusic }]
      }
    }

    if (lower.includes('tatil') || lower.includes('yaz') || lower.includes('sahil')) {
      const summerSongs = songs.filter(s => s.genre === 'pop' || s.genre === 'reggae' || s.genre === 'tropical').slice(0, 5)
      return {
        role: 'dj',
        text: 'Tatil havası! Bu şarkılarla sahile dönüş 🏖️',
        songs: summerSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('gece') || lower.includes('night') || lower.includes('uyku')) {
      const nightSongs = songs.filter(s => s.genre === 'ambient' || s.genre === 'lofi' || s.genre === 'r&b').slice(0, 5)
      return {
        role: 'dj',
        text: 'Gece modu! Bu şarkılarla rahat uyu 🌙',
        songs: nightSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    if (lower.includes('spor') || lower.includes('workout') || lower.includes('egzersiz')) {
      const workoutSongs = songs.filter(s => s.bpm && s.bpm > 130).slice(0, 5)
      return {
        role: 'dj',
        text: 'Spor zamanı! Bu şarkılarla motive ol 💪',
        songs: workoutSongs,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }]
      }
    }

    // Default response
    const defaultSongs = [...songs].sort(() => Math.random() - 0.5).slice(0, 3)
    return {
      role: 'dj',
      text: 'Harika seçim! İşte sana özel önerilerim ✨',
      songs: defaultSongs,
      actions: [{ label: 'Karıştır', action: 'shuffle', icon: Shuffle }]
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg: Message = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const aiMsg = getAIResponse(input)
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 800 + Math.random() * 1200)
  }

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song)
    setIsPlaying(true)
  }

  const handlePlayAll = (songList: Song[]) => {
    setQueue(songList)
    setCurrentSong(songList[0])
    setIsPlaying(true)
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI DJ</h1>
            <p className="text-xs text-surface-400">Müzik zevkini anlıyor, sana özel öneriler sunuyor</p>
          </div>
        </div>
      </div>

      {/* Mood Quick Select */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => {
                setInput(mood.label)
                setTimeout(() => handleSend(), 100)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-800/60 border border-surface-700 hover:border-wave-500/50 transition-all whitespace-nowrap group"
            >
              <span className="text-lg">{mood.emoji}</span>
              <span className="text-sm text-surface-300 group-hover:text-white transition-colors">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-wave-500/20 to-purple-600/20 flex items-center justify-center border border-wave-500/20">
              <Sparkles size={36} className="text-wave-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Merhaba! Ben AI DJ'in</h2>
            <p className="text-surface-400 text-sm max-w-xs mx-auto">
              Ne tür müzik istiyorsan söyle, sana özel öneriler sunayım. Mood'unu seç veya yaz!
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'space-y-3'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-wave-600 text-white rounded-br-md'
                  : 'bg-surface-800 text-surface-200 rounded-bl-md border border-surface-700/50'
              }`}>
                {msg.text}
              </div>

              {/* Song Cards */}
              {msg.songs && msg.songs.length > 0 && (
                <div className="space-y-2">
                  {msg.songs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handlePlaySong(song)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/60 border border-surface-700/50 hover:border-wave-500/30 cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music size={18} className="text-surface-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{song.title}</p>
                        <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-surface-500">{formatDuration(song.duration)}</span>
                        <div className="w-8 h-8 rounded-full bg-wave-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={14} className="text-wave-400 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex gap-2">
                  {msg.actions.map((act) => (
                    <button
                      key={act.label}
                      onClick={() => {
                        if (act.action === 'play_all' && msg.songs) handlePlayAll(msg.songs)
                        if (act.action === 'shuffle' && msg.songs) {
                          const shuffled = [...msg.songs].sort(() => Math.random() - 0.5)
                          handlePlayAll(shuffled)
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-wave-500/10 border border-wave-500/30 text-xs text-wave-400 hover:bg-wave-500/20 transition-all"
                    >
                      <act.icon size={12} />
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-20 left-0 right-0 z-40 bg-surface-950/80 backdrop-blur-xl border-t border-surface-800/50">
        <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="DJ'ine bir şey söyle..."
            className="flex-1 bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-12 h-12 rounded-xl bg-wave-600 text-white flex items-center justify-center hover:bg-wave-500 transition-colors disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
