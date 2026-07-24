import { useEffect, useState } from 'react'

interface UpdateInfo {
  version?: string
  releaseDate?: string
}

export default function useAutoUpdate() {
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    api.onUpdateChecking(() => { setChecking(true); setError('') })
    api.onUpdateAvailable((info: UpdateInfo) => { setChecking(false); setAvailable(info); setError('') })
    api.onUpdateNotAvailable(() => { setChecking(false); setAvailable(null) })
    api.onUpdateProgress((p: any) => { setDownloading(true); setProgress(p.percent || 0) })
    api.onUpdateDownloaded(() => { setDownloading(false); setDownloaded(true) })
    api.onUpdateError((msg: string) => { setChecking(false); setDownloading(false); setError(msg) })

    api.checkForUpdates()
    const interval = setInterval(() => api.checkForUpdates(), 3600000)
    return () => clearInterval(interval)
  }, [])

  const downloadUpdate = () => {
    const api = (window as any).electronAPI
    if (!api) return
    setDownloading(true)
    api.downloadUpdate()
  }

  const installUpdate = () => {
    const api = (window as any).electronAPI
    if (!api) return
    api.installUpdate()
  }

  return { checking, available, downloading, progress, downloaded, error, downloadUpdate, installUpdate }
}