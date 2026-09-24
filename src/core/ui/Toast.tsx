import { useUiStore } from '@/stores/uiStore';
import { Info, X } from 'lucide-react';

// Marka/stil degisikligi yok: siniflar ToastContainer ile ayni, kaynak useUiStore.
export function Toast() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-slide-down backdrop-blur-xl bg-surface-800/80 border-surface-700/50 text-surface-200"
        >
          <Info size={16} className="text-wave-400 flex-shrink-0" />
          <span className="text-sm font-medium">{t.msg}</span>
          <button onClick={() => dismissToast(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;
