import { AudioWaveform } from 'lucide-react'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <div
      className={`bg-wave-400 flex items-center justify-center shadow-[0_0_24px_rgba(198,255,62,0.35)] ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
      }}
    >
      <AudioWaveform size={size * 0.58} className="text-black" />
    </div>
  )
}
