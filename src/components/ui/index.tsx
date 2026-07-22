import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-800/50', className)}
      {...props}
    />
  )
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline' | 'primary' | 'danger'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave-400/50 disabled:pointer-events-none disabled:opacity-40 select-none',
        {
          'bg-surface-800 hover:bg-surface-700 text-white border border-surface-700 hover:border-surface-600 active:scale-[0.97]': variant === 'default',
          'hover:bg-white/5 text-surface-300 hover:text-white active:scale-[0.97]': variant === 'ghost',
          'border border-surface-700 hover:border-wave-400/50 text-surface-300 hover:text-white bg-transparent': variant === 'outline',
          'bg-gradient-to-r from-wave-500 to-wave-400 hover:from-wave-400 hover:to-wave-300 text-white font-semibold shadow-lg shadow-wave-500/20 hover:shadow-wave-400/30 active:scale-[0.97]': variant === 'primary',
          'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 active:scale-[0.97]': variant === 'danger',
        },
        {
          'h-10 px-5 text-sm': size === 'default',
          'h-8 px-3 text-xs': size === 'sm',
          'h-12 px-7 text-base': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl bg-surface-900 border border-surface-700 px-4 py-2 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:border-wave-400/50 focus:ring-1 focus:ring-wave-400/20 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className={cn('relative w-full h-1.5 group cursor-pointer', className)}>
      <div className="absolute inset-0 rounded-full bg-surface-700/50" />
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/60 group-hover:bg-wave-400 transition-all duration-150"
        style={{ width: `${percent}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${percent}% - 7px)` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}

export { Skeleton, Button, Input, Slider }
