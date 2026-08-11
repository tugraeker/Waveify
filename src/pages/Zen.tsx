import { BreathRoom, Meditation } from '@/components/Zen'

export default function ZenPage() {
  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Zen</h1>
        <p className="text-sm text-surface-500 mt-1">Nefes egzersizleri ve rehberli meditasyon</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <BreathRoom />
        <Meditation />
      </div>
    </div>
  )
}
