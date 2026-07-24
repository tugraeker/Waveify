import { useState, useRef } from 'react'
import { useStore } from '@/store/store'
import { formatDuration } from '@/lib/utils'
import { Music2, X, Play, GripVertical } from 'lucide-react'

export default function QueuePage() {
  const { queue, currentSong, removeFromQueue, setCurrentSong, setQueue } = useStore()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const playSong = (song: any) => {
    const idx = queue.findIndex((s) => s.id === song.id)
    if (idx > -1) setCurrentSong(song)
  }

  const clearQueue = () => setQueue([])

  function handleDragStart(i: number) {
    setDragIdx(i)
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    dragOverIdx.current = i
  }

  function handleDrop() {
    if (dragIdx === null || dragOverIdx.current === null) return
    const from = dragIdx
    const to = dragOverIdx.current
    if (from === to) { setDragIdx(null); return }
    const newQueue = [...queue]
    const [moved] = newQueue.splice(from, 1)
    newQueue.splice(to, 0, moved)
    setQueue(newQueue)
    setDragIdx(null)
  }

  return (
    <div className="p-6 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sıradaki</h1>
        {queue.length > 0 && (
          <button onClick={clearQueue} className="text-sm text-surface-500 hover:text-white transition-colors">
            Temizle
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-surface-500 glass rounded-2xl border-dashed">
          <Music2 size={48} className="mb-3 opacity-50" />
          <p className="text-sm">Sırada şarkı yok</p>
          <p className="text-xs mt-1">Kitaplıktan şarkı seçip sıraya ekleyin</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {queue.map((song, i) => (
            <div
              key={`${song.id}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={handleDrop}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all group ${
                currentSong?.id === song.id ? 'bg-wave-500/10 border border-wave-500/20 shadow-sm shadow-wave-500/10' : 'hover:bg-white/5 border border-transparent'
              } ${dragIdx === i ? 'opacity-50 scale-[0.98]' : ''}`}
            >
              <div className="text-surface-500 hover:text-surface-300 cursor-grab active:cursor-grabbing">
                <GripVertical size={15} />
              </div>
              <span className="w-5 text-xs text-surface-500 text-right tabular-nums">{i + 1}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              >
                <X size={14} />
              </button>
              {song.cover_url ? (
                <img src={song.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
                  <Music2 size={14} className="text-surface-500" />
                </div>
              )}
              <div className="flex-1 min-w-0" onClick={() => playSong(song)}>
                <p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-wave-400' : 'text-white'}`}>
                  {song.title}
                </p>
                <p className="text-xs text-surface-400 truncate">{song.artist}</p>
              </div>
              <button onClick={() => playSong(song)} className="opacity-0 group-hover:opacity-100 text-wave-400 transition-opacity">
                <Play size={14} fill="currentColor" />
              </button>
              <span className="text-xs text-surface-500 tabular-nums">{formatDuration(song.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
