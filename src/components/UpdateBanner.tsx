import { useState } from 'react'
import useAutoUpdate from '@/hooks/useAutoUpdate'
import { Loader2, Download, RotateCw, AlertTriangle, X } from 'lucide-react'

export default function UpdateBanner() {
  const { checking, available, downloading, progress, downloaded, error, downloadUpdate, installUpdate } = useAutoUpdate()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || (!checking && !available && !downloading && !downloaded && !error)) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
      <div className="glass rounded-2xl p-4 border border-surface-700 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {checking && <Loader2 size={18} className="text-wave-400 animate-spin" />}
            {available && <Download size={18} className="text-wave-400" />}
            {downloading && <Loader2 size={18} className="text-wave-400 animate-spin" />}
            {downloaded && <RotateCw size={18} className="text-green-400" />}
            {error && <AlertTriangle size={18} className="text-red-400" />}
          </div>
          <div className="flex-1 min-w-0">
            {checking && <p className="text-sm text-surface-300">Güncelleme kontrol ediliyor...</p>}
            {available && (
              <>
                <p className="text-sm font-medium text-white">Güncelleme mevcut v{available.version}</p>
                <p className="text-xs text-surface-400 mt-1">Yeni sürüm hazır. İndirmek ister misin?</p>
                <button onClick={downloadUpdate} className="mt-2 px-4 py-1.5 rounded-lg bg-wave-500 text-white text-xs font-medium hover:bg-wave-600 transition-colors">
                  İndir
                </button>
              </>
            )}
            {downloading && (
              <>
                <p className="text-sm font-medium text-white">Güncelleme indiriliyor...</p>
                <div className="mt-2 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full bg-wave-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <p className="text-xs text-surface-400 mt-1">%{Math.round(progress)}</p>
              </>
            )}
            {downloaded && (
              <>
                <p className="text-sm font-medium text-green-400">Güncelleme indirildi</p>
                <button onClick={installUpdate} className="mt-2 px-4 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors">
                  Yeniden Başlat ve Güncelle
                </button>
              </>
            )}
            {error && <p className="text-sm text-red-400">Güncelleme hatası: {error}</p>}
          </div>
          <button onClick={() => setDismissed(true)} className="text-surface-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}