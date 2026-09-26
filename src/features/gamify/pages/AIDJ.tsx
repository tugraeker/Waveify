/**
 * AI DJ v2 — Yerel AI Beyni ile Güçlendirilmiş
 * Gerçek NLP anlama + ses analizi + dinleme alışkanlığı öğrenme
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import {
  parseNLPIntent, filterSongsByIntent, analyzeSong,
  generateListeningInsight, findSimilarSongs,
  getMoodEmoji, getMoodLabel, getSongAuraColor,
  type SongMood, type NLPIntent, type ListeningInsight,
} from '@/lib/localAI'
import type { Song } from '@/types'
import {
  Bot, Send, Sparkles, Music, Play, Pause, Shuffle, SkipForward,
  ListMusic, Heart, Zap, Moon, Coffee, Dumbbell, Headphones,
  BarChart3, Brain, Lightbulb, TrendingUp, Search, X,
  ChevronRight, Clock, Star, Radio, Flame, Wind,
} from 'lucide-react'

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'dj'
  text: string
  songs?: Song[]
  insight?: ListeningInsight
  actions?: { label: string; action: string; icon: any }[]
  mood?: SongMood
  typing?: boolean
}

const MOOD_BUTTONS = [
  { id: 'energetic' as SongMood, label: 'Enerji',     emoji: '⚡', color: 'from-orange-500 to-red-500',    text: 'enerji ver' },
  { id: 'chill'     as SongMood, label: 'Sakin',      emoji: '🌊', color: 'from-blue-500 to-cyan-500',     text: 'sakin bir şeyler çal' },
  { id: 'focus'     as SongMood, label: 'Odak',       emoji: '🎯', color: 'from-indigo-500 to-blue-600',   text: 'odaklanmam lazım' },
  { id: 'party'     as SongMood, label: 'Parti',      emoji: '🎉', color: 'from-fuchsia-500 to-pink-500',  text: 'parti modu' },
  { id: 'melancholic' as SongMood, label: 'Hüzün',   emoji: '💜', color: 'from-violet-500 to-purple-700', text: 'melankolik şeyler' },
  { id: 'happy'     as SongMood, label: 'Mutlu',      emoji: '☀️', color: 'from-yellow-400 to-amber-500',  text: 'mutlu şarkılar' },
  { id: 'sleep'     as SongMood, label: 'Uyku',       emoji: '🌙', color: 'from-slate-600 to-indigo-900',  text: 'uyku zamanı' },
  { id: 'romantic'  as SongMood, label: 'Romantik',   emoji: '💕', color: 'from-rose-400 to-pink-600',     text: 'romantik hissediyorum' },
  { id: 'dark'      as SongMood, label: 'Karanlık',   emoji: '🖤', color: 'from-gray-700 to-zinc-900',     text: 'karanlık şeyler' },
  { id: 'epic'      as SongMood, label: 'Destansı',   emoji: '⚔️', color: 'from-red-600 to-orange-700',   text: 'destansı müzik' },
]

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export default function AIDJ() {
  const navigate = useNavigate()
  const { user, songs, setCurrentSong, setQueue } = useStore()
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [isTyping, setIsTyping]         = useState(false)
  const [listeningHistory, setHistory]  = useState<Song[]>([])
  const [insight, setInsight]           = useState<ListeningInsight | null>(null)
  const [tab, setTab]                   = useState<'chat' | 'insight' | 'fingerprint'>('chat')
  const [fingerprintSong, setFpSong]    = useState<Song | null>(null)
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
      .limit(100)
    const hist = (data || []).map((h: any) => h.song).filter(Boolean) as Song[]
    setHistory(hist)

    // İçgörü üret
    const stats = JSON.parse(localStorage.getItem('waveify_stats') || '{}')
    const ins = generateListeningInsight(
      songs,
      hist.map(s => ({ song: s })),
      stats,
    )
    setInsight(ins)
  }

  // ─── AI Cevap Üreticisi ──────────────────────────────────────────────────────

  const generateAIResponse = useCallback((userInput: string): Message => {
    const intent: NLPIntent = parseNLPIntent(userInput, songs)
    const filteredSongs = filterSongsByIntent(intent, songs)

    if (intent.type === 'stats') {
      const stats = JSON.parse(localStorage.getItem('waveify_stats') || '{}')
      const total = songs.length
      const mins = Math.round(listeningHistory.reduce((a, s) => a + (s.duration || 0), 0) / 60)
      return {
        role: 'dj',
        text: `📊 İstatistiklerin:\n• Kütüphanende ${total} şarkı var\n• Bugüne kadar ~${mins} dakika müzik dinledin\n• Toplam ${stats.songsListened || 0} kez şarkı başlattın`,
        actions: [{ label: 'Detaylı İstatistik', action: 'goto_stats', icon: BarChart3 }],
      }
    }

    if (intent.type === 'control') {
      return {
        role: 'dj',
        text: `✅ Anladım! Player kontrolleri için alttaki çubuğu kullanabilirsin.`,
        actions: [{ label: 'Now Playing', action: 'goto_now_playing', icon: Music }],
      }
    }

    if (intent.type === 'discovery' && filteredSongs.length > 0) {
      const current = songs[Math.floor(Math.random() * songs.length)]
      const similar = findSimilarSongs(current, songs, 5)
      return {
        role: 'dj',
        mood: analyzeSong(current).mood,
        text: `🔍 "${current.title}" şarkısına benzer keşifler:`,
        songs: similar,
        actions: [{ label: 'Hepsini Çal', action: 'play_all', icon: Play }],
      }
    }

    return {
      role: 'dj',
      mood: intent.mood,
      text: intent.response,
      songs: filteredSongs,
      actions: filteredSongs.length > 0
        ? [
            { label: 'Hepsini Çal', action: 'play_all', icon: Play },
            { label: 'Karıştır',    action: 'shuffle',  icon: Shuffle },
          ]
        : [],
    }
  }, [songs, listeningHistory])

  // ─── Mesaj Gönder ─────────────────────────────────────────────────────────────

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim()
    if (!text) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setIsTyping(true)

    const delay = 600 + Math.random() * 900
    setTimeout(() => {
      const aiMsg = generateAIResponse(text)
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, delay)
  }

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song)
  }

  const handlePlayAll = (songList: Song[]) => {
    if (!songList.length) return
    setQueue(songList)
    setCurrentSong(songList[0])
  }

  const handleAction = (action: string, songList?: Song[]) => {
    if (action === 'play_all' && songList) handlePlayAll(songList)
    if (action === 'shuffle' && songList) handlePlayAll([...songList].sort(() => Math.random() - 0.5))
    if (action === 'goto_stats') navigate('/stats')
    if (action === 'goto_now_playing') navigate('/now-playing')
  }

  // ─── Şarkı Parmak İzi Görünümü ────────────────────────────────────────────────

  const renderFingerprint = (song: Song) => {
    const fp = analyzeSong(song)
    const aura = getSongAuraColor(song)
    const bars = [fp.bassRatio, fp.midRatio, fp.trebleRatio, fp.danceability, fp.energy, fp.valence]

    return (
      <div className="p-5 rounded-2xl border border-surface-700/50 bg-surface-900/60 space-y-4">
        <div className="flex items-center gap-3">
          {song.cover_url
            ? <img src={song.cover_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            : <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: aura + '33' }}><Music size={20} style={{ color: aura }} /></div>
          }
          <div>
            <p className="font-semibold text-white">{song.title}</p>
            <p className="text-sm text-surface-400">{song.artist}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg">{getMoodEmoji(fp.mood)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold border" style={{ borderColor: aura + '60', color: aura, backgroundColor: aura + '18' }}>
                {getMoodLabel(fp.mood)}
              </span>
            </div>
          </div>
        </div>

        {/* Frekans çubukları */}
        <div className="space-y-2">
          {[
            { label: 'Bas',           val: fp.bassRatio },
            { label: 'Orta Frekans',  val: fp.midRatio },
            { label: 'Tiz',           val: fp.trebleRatio },
            { label: 'Dans Edilebilirlik', val: fp.danceability },
            { label: 'Enerji',        val: fp.energy },
            { label: 'Pozitiflik',    val: fp.valence },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-surface-400 w-32 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(val * 100)}%`, background: aura }}
                />
              </div>
              <span className="text-xs text-surface-400 w-8 text-right tabular-nums">
                {Math.round(val * 100)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {fp.tags.map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-surface-800 text-surface-300 border border-surface-700">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-surface-400 border-t border-surface-800 pt-3">
          <span>🎵 ~{Math.round(fp.tempo)} BPM</span>
          <span>⚡ Enerji: {Math.round(fp.energy * 100)}%</span>
          <span>💃 Dans: {Math.round(fp.danceability * 100)}%</span>
        </div>
      </div>
    )
  }

  // ─── İçgörü Görünümü ──────────────────────────────────────────────────────────

  const renderInsight = () => {
    if (!insight) return (
      <div className="text-center py-16 text-surface-500 text-sm">
        İçgörü yükleniyor...
      </div>
    )

    return (
      <div className="space-y-4 p-4">
        {/* AI Özet */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-wave-500/10 to-purple-600/10 border border-wave-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={18} className="text-wave-400" />
            <span className="text-sm font-semibold text-wave-300">AI Dinleme Analizi</span>
          </div>
          <p className="text-sm text-surface-200 leading-relaxed">{insight.aiSummary}</p>
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">💡 {insight.funFact}</p>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
            <Clock size={16} className="text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{insight.totalMinutes}</p>
            <p className="text-xs text-surface-400">dakika dinlendi</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
            <Star size={16} className="text-amber-400 mb-2" />
            <p className="text-sm font-bold text-white truncate">{insight.topArtist}</p>
            <p className="text-xs text-surface-400">en çok dinlenen sanatçı</p>
          </div>
        </div>

        {/* Kişilik tipi */}
        <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-fuchsia-400" />
            <span className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider">Müzik Kişiliğin</span>
          </div>
          <p className="text-sm text-white font-medium">{insight.personalityType}</p>
        </div>

        {/* Ruh hali yolculuğu */}
        {insight.moodJourney.length > 0 && (
          <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Son Ruh Hali Yolculuğun</p>
            <div className="flex gap-2 flex-wrap">
              {insight.moodJourney.map((mood, i) => (
                <span key={i} className="text-xl" title={getMoodLabel(mood)}>
                  {getMoodEmoji(mood)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enerji eğrisi */}
        <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Haftalık Enerji Eğrisi</p>
          <div className="flex items-end gap-1 h-16">
            {insight.energyCurve.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{
                height: `${v}%`,
                background: `linear-gradient(to top, #8b5cf6, #c084fc)`,
                opacity: 0.6 + i * 0.05,
              }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => (
              <span key={d} className="text-[9px] text-surface-500">{d}</span>
            ))}
          </div>
        </div>

        {/* Öneriler */}
        <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">AI Önerileri</span>
          </div>
          <div className="space-y-2">
            {insight.recommendations.map((rec, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-300">
                <ChevronRight size={14} className="text-wave-400 shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Sohbet Mesaj Kartı ───────────────────────────────────────────────────────

  const renderMessage = (msg: Message, i: number) => {
    const isUser = msg.role === 'user'
    return (
      <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[90%] ${isUser ? '' : 'space-y-3'}`}>
          {!isUser && (
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <span className="text-xs text-surface-500">AI DJ</span>
              {msg.mood && (
                <span className="text-base">{getMoodEmoji(msg.mood)}</span>
              )}
            </div>
          )}

          <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
            isUser
              ? 'bg-wave-600 text-white rounded-br-md'
              : 'bg-surface-800/80 text-surface-200 rounded-bl-md border border-surface-700/40'
          }`}>
            {msg.text}
          </div>

          {/* Şarkı Listesi */}
          {msg.songs && msg.songs.length > 0 && (
            <div className="space-y-1.5">
              {msg.songs.map(song => {
                const fp = analyzeSong(song)
                const aura = getSongAuraColor(song)
                return (
                  <div
                    key={song.id}
                    onClick={() => handlePlaySong(song)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/40 hover:border-wave-500/30 cursor-pointer transition-all group"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {song.cover_url
                        ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: aura + '33' }}>
                            <Music size={16} style={{ color: aura }} />
                          </div>
                      }
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={14} className="text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{song.title}</p>
                      <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
                      <span className="text-xs">{getMoodEmoji(fp.mood)}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setTab('fingerprint'); setFpSong(song) }}
                      className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-500 hover:text-wave-400 transition-colors ml-1"
                      title="Şarkı Parmak İzi"
                    >
                      <BarChart3 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Aksiyon Butonları */}
          {msg.actions && msg.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {msg.actions.map(act => (
                <button
                  key={act.label}
                  onClick={() => handleAction(act.action, msg.songs)}
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
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-950/90 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">Waveify AI DJ</h1>
            <p className="text-[11px] text-surface-400">Yerel yapay zeka • Sıfır dış API</p>
          </div>
          {/* Sekme */}
          <div className="flex gap-1 bg-surface-800/60 rounded-xl p-1">
            {([
              { id: 'chat',        icon: Bot,      label: 'Sohbet'  },
              { id: 'insight',     icon: Brain,    label: 'Analiz'  },
              { id: 'fingerprint', icon: BarChart3, label: 'DNA'    },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.id
                    ? 'bg-wave-500 text-white shadow'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                <t.icon size={13} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CHAT sekmesi ─── */}
      {tab === 'chat' && (
        <>
          {/* Mood hızlı seçim */}
          <div className="max-w-2xl mx-auto w-full px-4 pt-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
              {MOOD_BUTTONS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => handleSend(mood.text)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface-800/60 border border-surface-700 hover:border-wave-500/50 transition-all whitespace-nowrap shrink-0"
                >
                  <span className="text-base">{mood.emoji}</span>
                  <span className="text-xs text-surface-300">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mesajlar */}
          <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-wave-500/20 to-purple-600/20 flex items-center justify-center border border-wave-500/20">
                  <Sparkles size={36} className="text-wave-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Merhaba! Ben AI DJ'inim 🎧</h2>
                <p className="text-surface-400 text-sm max-w-xs mx-auto">
                  Ne hissediyorsun? Ruh halini yaz veya yukarıdaki butonlardan birini seç. Yerel yapay zeka müzik zevkini analiz ediyor.
                </p>
                <div className="mt-6 flex flex-col gap-2 items-center">
                  {[
                    '🔍 "Bugün biraz melankolik hissediyorum"',
                    '🎵 "En çok hangi şarkıları dinledim?"',
                    '⚡ "Spor için bir şeyler öner"',
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => handleSend(hint.slice(3))}
                      className="text-xs text-surface-400 hover:text-wave-400 transition-colors py-1"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(renderMessage)}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-surface-800/80 border border-surface-700/40 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-wave-500 to-purple-600 flex items-center justify-center">
                    <Bot size={14} className="text-white" />
                  </div>
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
          <div className="sticky bottom-0 bg-surface-950/90 backdrop-blur-xl border-t border-surface-800/50">
            <form onSubmit={e => { e.preventDefault(); handleSend() }} className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ruh halini yaz veya istediğini sor..."
                className="flex-1 bg-surface-800/80 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-wave-500/50 transition-colors"
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
        </>
      )}

      {/* ─── ANALIZ sekmesi ─── */}
      {tab === 'insight' && (
        <div className="max-w-2xl mx-auto w-full overflow-y-auto">
          {renderInsight()}
        </div>
      )}

      {/* ─── DNA sekmesi ─── */}
      {tab === 'fingerprint' && (
        <div className="max-w-2xl mx-auto w-full p-4 space-y-4 overflow-y-auto">
          <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">Şarkı AI Analizi</p>

          {/* Şarkı seçici */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
            {songs.map(song => (
              <button
                key={song.id}
                onClick={() => setFpSong(song)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                  fingerprintSong?.id === song.id
                    ? 'bg-wave-500/10 border border-wave-500/30'
                    : 'bg-surface-800/40 border border-surface-700/30 hover:border-surface-600'
                }`}
              >
                {song.cover_url
                  ? <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                      <Music size={14} className="text-surface-500" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{song.title}</p>
                  <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                </div>
                <span className="text-base">{getMoodEmoji(analyzeSong(song).mood)}</span>
              </button>
            ))}
          </div>

          {/* Parmak izi */}
          {fingerprintSong
            ? renderFingerprint(fingerprintSong)
            : (
              <div className="text-center py-10 text-surface-500 text-sm">
                Yukarıdan bir şarkı seç — AI analiz edecek
              </div>
            )
          }

          {/* Benzer şarkılar */}
          {fingerprintSong && songs.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Buna Benzer Şarkılar</p>
              {findSimilarSongs(fingerprintSong, songs, 4).map(song => (
                <div
                  key={song.id}
                  onClick={() => handlePlaySong(song)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 border border-surface-700/30 hover:border-wave-500/30 cursor-pointer transition-all"
                >
                  {song.cover_url
                    ? <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    : <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                        <Music size={14} className="text-surface-500" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{song.title}</p>
                    <p className="text-xs text-surface-400 truncate">{song.artist}</p>
                  </div>
                  <span className="text-base">{getMoodEmoji(analyzeSong(song).mood)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
