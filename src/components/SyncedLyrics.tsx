import { useRef, useEffect } from 'react'

interface Props {
  lyrics: string
  currentTime: number
}

export default function SyncedLyrics({ lyrics, currentTime }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

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
    if (!hasTimestamps || activeIdx < 0 || !containerRef.current) return
    const el = containerRef.current.children[activeIdx] as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIdx, hasTimestamps])

  if (!hasTimestamps) {
    return (
      <div className="max-w-md w-full max-h-48 overflow-y-auto scrollbar-thin text-center leading-relaxed px-4 text-sm text-surface-300">
        {lines.map((l, i) => (
          <p key={i} className="py-0.5">{l.text}</p>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-md w-full max-h-48 overflow-y-auto scrollbar-thin text-center leading-relaxed px-4">
      {lines.length === 0 && <p className="text-surface-500 text-sm">Söz bulunamadı</p>}
      {lines.map((l, i) => (
        <p
          key={i}
          className={`transition-all duration-300 py-0.5 ${
            i === activeIdx
              ? 'text-wave-400 text-base font-semibold scale-105'
              : i === activeIdx - 1 || i === activeIdx + 1
              ? 'text-surface-300 text-sm'
              : 'text-surface-500 text-sm'
          }`}
        >
          {l.text}
        </p>
      ))}
    </div>
  )
}
