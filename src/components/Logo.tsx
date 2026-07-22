import { AudioWaveform } from 'lucide-react'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <div
      className={`bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center shadow-lg shadow-wave-500/20 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
      }}
    >
      <AudioWaveform size={size * 0.6} className="text-white" />
    </div>
  )
}
