import { useState, useRef } from 'react'
import { safeParse } from '@/lib/utils'
import { Play, Pause, SkipBack, SkipForward, Download, Bookmark, Clock, BookOpen, Star } from 'lucide-react'

interface Episode {
  id: string
  title: string
  duration: number
  audio_url: string
  description: string
  published: string
}

export default function PodcastPlayer({ episodes, podcastTitle }: { episodes: Episode[]; podcastTitle: string }) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [bookmarks, setBookmarks] = useState<string[]>(safeParse(localStorage.getItem('waveify_podcast_bookmarks'), []))
  const [notes, setNotes] = useState<Record<string, string>>(safeParse(localStorage.getItem('waveify_podcast_notes'), {}))
  const [noteInput, setNoteInput] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  function togglePlay(ep?: Episode) {
    if (ep && ep.id !== currentEpisode?.id) {
      setCurrentEpisode(ep)
      setIsPlaying(true)
      if (audioRef.current) { audioRef.current.src = ep.audio_url; audioRef.current.play() }
    } else if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      audioRef.current?.play()
      setIsPlaying(true)
    }
  }

  function toggleBookmark(epId: string) {
    const next = bookmarks.includes(epId) ? bookmarks.filter(b => b !== epId) : [...bookmarks, epId]
    setBookmarks(next)
    localStorage.setItem('waveify_podcast_bookmarks', JSON.stringify(next))
  }

  function saveNote() {
    if (!currentEpisode || !noteInput.trim()) return
    const next = { ...notes, [currentEpisode.id]: noteInput.trim() }
    setNotes(next)
    localStorage.setItem('waveify_podcast_notes', JSON.stringify(next))
    setNoteInput('')
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      {currentEpisode && (
        <div className="glass rounded-2xl p-4 border border-surface-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentEpisode.title}</p>
              <p className="text-xs text-surface-400">{podcastTitle}</p>
            </div>
            <button onClick={() => toggleBookmark(currentEpisode.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-yellow-400 transition-colors">
              <Bookmark size={16} fill={bookmarks.includes(currentEpisode.id) ? '#fbbf24' : 'none'} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mb-3">
            <button onClick={() => setPlaybackSpeed(s => s >= 2 ? 0.5 : s + 0.25)} className="text-xs font-mono px-2 py-1 rounded-lg bg-surface-800 text-wave-400">
              {playbackSpeed}x
            </button>
            <button className="text-surface-400 hover:text-white"><SkipBack size={18} /></button>
            <button onClick={() => togglePlay()} className="bg-white text-surface-950 rounded-full p-3 hover:scale-105 transition-all">
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button className="text-surface-400 hover:text-white"><SkipForward size={18} /></button>
            <button onClick={() => saveNote()} className="text-xs px-2 py-1 rounded-lg bg-surface-800 text-surface-400">
              <BookOpen size={14} />
            </button>
          </div>
          {noteInput && (
            <div className="flex gap-2">
              <input value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Bölüm notu..." className="flex-1 h-8 rounded-lg bg-surface-800 border border-surface-700 px-3 text-xs text-white" />
              <button onClick={saveNote} className="h-8 px-3 rounded-lg bg-wave-500 text-white text-xs">Kaydet</button>
            </div>
          )}
          {notes[currentEpisode.id] && (
            <p className="text-xs text-surface-400 mt-2 italic">📝 {notes[currentEpisode.id]}</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        {episodes.map(ep => (
          <div key={ep.id} onClick={() => togglePlay(ep)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
            <button className="p-2 rounded-full bg-surface-800 text-surface-400 group-hover:text-wave-400 transition-colors">
              {isPlaying && currentEpisode?.id === ep.id ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{ep.title}</p>
              <p className="text-xs text-surface-500">{ep.description.slice(0, 60)}...</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-surface-500">
              <Clock size={10} /> {Math.floor(ep.duration / 60)}dk
            </div>
            <button onClick={e => { e.stopPropagation(); toggleBookmark(ep.id) }} className="p-1 text-surface-500 hover:text-yellow-400 transition-colors">
              <Bookmark size={12} fill={bookmarks.includes(ep.id) ? '#fbbf24' : 'none'} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
