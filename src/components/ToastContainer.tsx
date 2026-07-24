import { useToast } from '@/hooks/useToast'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-slide-down backdrop-blur-xl ${
            t.type === 'success' ? 'bg-green-900/80 border-green-500/30 text-green-300' :
            t.type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-300' :
            'bg-surface-800/80 border-surface-700/50 text-surface-200'
          }`}
        >
          {t.type === 'success' && <CheckCircle size={16} className="text-green-400 flex-shrink-0" />}
          {t.type === 'error' && <AlertCircle size={16} className="text-red-400 flex-shrink-0" />}
          {t.type === 'info' && <Info size={16} className="text-wave-400 flex-shrink-0" />}
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
