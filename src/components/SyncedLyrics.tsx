interface Props {
  lyrics: string
  currentTime: number
}

export default function SyncedLyrics({ lyrics, currentTime }: Props) {
  const lines = lyrics.split('\n').map((l) => {
    const match = l.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/)
    if (match) {
      const seconds = parseInt(match[1]) * 60 + parseFloat(match[2])
      return { time: seconds, text: match[3].trim() }
    }
    return { time: -1, text: l.trim() }
  }).filter((l) => l.text)

  let activeIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time >= 0 && lines[i].time <= currentTime) activeIdx = i
  }

  return (
    <div className="max-w-md w-full max-h-40 overflow-y-auto scrollbar-thin text-center leading-relaxed px-4">
      {lines.map((l, i) => (
        <p
          key={i}
          className={`transition-all duration-300 ${
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
