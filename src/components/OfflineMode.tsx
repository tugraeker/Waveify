import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Download, Trash2, HardDrive } from 'lucide-react'

export default function OfflineMode() {
  const [cachedCount, setCachedCount] = useState(0)
  const [cachedSize, setCachedSize] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.cacheList().then((ids) => {
      setCachedCount(ids.length)
      setCachedSize(`${(ids.length * 3).toFixed(0)} MB`)
    }).catch(() => {})
  }, [])

  const clearCache = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.cacheClear()
    if (result?.success) { setCachedCount(0); setCachedSize('0 MB') }
  }

  return (
    <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOnline ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          {isOnline ? <Wifi size={18} className="text-green-400" /> : <WifiOff size={18} className="text-yellow-400" />}
        </div>
        <h2 className="text-lg font-semibold">Çevrimdışı</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-surface-400">Durum</span>
          <span className={isOnline ? 'text-green-400' : 'text-yellow-400'}>
            {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
          </span>
        </div>
        {window.electronAPI && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-400 flex items-center gap-2"><HardDrive size={14} /> Önbellek</span>
              <span className="text-surface-300">{cachedCount} şarkı ({cachedSize})</span>
            </div>
            {cachedCount > 0 && (
              <button onClick={clearCache} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all">
                <Trash2 size={14} /> Önbelleği Temizle
              </button>
            )}
          </>
        )}
        {!window.electronAPI && (
          <p className="text-xs text-surface-500">Çevrimdışı mod yalnızca masaüstü uygulamasında kullanılabilir</p>
        )}
      </div>
    </div>
  )
}