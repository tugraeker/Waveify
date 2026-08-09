import { useRef, useEffect, useState } from 'react'

interface Props {
  lyrics: string
  currentTime: number
  onSeek?: (time: number) => void
}

export default function SyncedLyrics({ lyrics, currentTime, onSeek }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(14)
  const [karaoke, setKaraoke] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const lines = lyrics.split('\n').map((l) => {
    const match = l.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/)
    if (match) {
      const seconds = parseInt(match[1]) * 60 + parseFloat(match[2])
      return { time: seconds, text: match[3].trim() }
    }
    return { time: -1, text: l.trim() }
  }).filter((l) => l.text)

  const hasTimestamps = lines.some((l) => l.time >= 0)

  let activeIdx = -1
  if (hasTimestamps) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time >= 0 && lines[i].time <= currentTime) activeIdx = i
    }
  }

  useEffect(() => {
    if (!autoScroll || !hasTimestamps || activeIdx < 0 || !containerRef.current) return
    const el = containerRef.current.children[activeIdx] as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIdx, hasTimestamps, autoScroll])

  if (!hasTimestamps) {
    return (
      <div className="max-w-md w-full max-h-48 overflow-y-auto scrollbar-thin text-center leading-relaxed px-4"
        style={{ fontSize: `${fontSize}px` }}>
        {lines.map((l, i) => (
          <p key={i} className="py-0.5 text-surface-300">{l.text}</p>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-2">
        <button onClick={() => setFontSize(Math.max(10, fontSize - 2))} className="text-xs text-surface-500 hover:text-white transition-colors px-1">A-</button>
        <span className="text-[10px] text-surface-500">{fontSize}px</span>
        <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className="text-xs text-surface-500 hover:text-white transition-colors px-1">A+</button>
        <button onClick={() => setKaraoke(!karaoke)} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${karaoke ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500 hover:text-white'}`}>
          Karaoke
        </button>
        <button onClick={() => setAutoScroll(!autoScroll)} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${autoScroll ? 'bg-wave-500/10 text-wave-400' : 'text-surface-500 hover:text-white'}`}>
          {autoScroll ? 'Auto' : 'Manuel'}
        </button>
      </div>
      <div ref={containerRef} className="max-w-md w-full max-h-48 overflow-y-auto scrollbar-thin text-center leading-relaxed px-4"
        style={{ fontSize: `${fontSize}px` }}>
        {lines.length === 0 && <p className="text-surface-500 text-sm">Söz bulunamadı</p>}
        {lines.map((l, i) => {
          const isActive = i === activeIdx
          const nextTime = i < lines.length - 1 && lines[i + 1].time >= 0 ? lines[i + 1].time : l.time + 5
          const lineProgress = isActive && nextTime > l.time
            ? Math.min(1, Math.max(0, (currentTime - l.time) / (nextTime - l.time)))
            : 0

          return (
            <p
              key={i}
              onClick={() => { if (onSeek && l.time >= 0) onSeek(l.time) }}
              className={`transition-all duration-300 py-0.5 ${onSeek && l.time >= 0 ? 'cursor-pointer' : ''} ${
                isActive
                  ? 'text-wave-400 font-semibold scale-105'
                  : i === activeIdx - 1 || i === activeIdx + 1
                  ? 'text-surface-300'
                  : 'text-surface-500'
              }`}
            >
              {karaoke && isActive && lineProgress > 0 ? (
                <span>
                  <span style={{ color: '#22c7c0' }}>{l.text.slice(0, Math.floor(lineProgress * l.text.length))}</span>
                  <span className="text-surface-300">{l.text.slice(Math.floor(lineProgress * l.text.length))}</span>
                </span>
              ) : (
                l.text
              )}
            </p>
          )
        })}
      </div>
    </div>
  )
}
