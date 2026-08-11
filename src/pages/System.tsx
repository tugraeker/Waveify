import ScreenRecorder from '@/components/ScreenRecorder'
import { CloudSync } from '@/components/SystemTools'
import { SystemStatus } from '@/components/SystemTools'

export default function SystemPage() {
  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6">Sistem</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        <ScreenRecorder />
        <CloudSync />
        <SystemStatus />
      </div>
    </div>
  )
}
