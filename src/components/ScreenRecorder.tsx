import { useEffect, useRef, useState } from 'react'
import { emitToast } from '@/hooks/useToast'
import { MonitorPlay, Download, Square } from 'lucide-react'

/* 167 — Ekran Kaydedici */
export default function ScreenRecorder() {
  const [recording, setRecording] = useState(false)
  const [recUrl, setRecUrl] = useState<string | null>(null)
  const [recTime, setRecTime] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number>(0)

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setRecUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRef.current = rec
      rec.start()
      setRecording(true)
      setRecUrl(null)
      setRecTime(0)
      timerRef.current = window.setInterval(() => setRecTime((t) => t + 1), 1000)
    } catch { emitToast('Ekran paylaşımı iptal edildi', 'info') }
  }

  function stop() {
    mediaRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  useEffect(() => {
    return () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const mm = Math.floor(recTime / 60)
  const ss = recTime % 60

  return (
    <div className="glass rounded-2xl p-5 border border-rose-500/15">
      <div className="flex items-center gap-2 mb-1">
        <MonitorPlay size={15} className="text-rose-400" />
        <p className="text-sm font-bold text-white">Ekran Kaydedici</p>
        {recording && <span className="ml-auto text-[10px] font-bold text-red-400 animate-pulse">● KAYIT {mm}:{ss.toString().padStart(2, '0')}</span>}
      </div>
      <p className="text-[11px] text-surface-500 mb-3">Ekranını WebM olarak kaydet</p>
      {!recording ? (
        <button onClick={start} className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-opacity">
          Kaydı Başlat
        </button>
      ) : (
        <button onClick={stop} className="w-full py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors flex items-center justify-center gap-1.5">
          <Square size={12} fill="currentColor" /> Kaydı Durdur
        </button>
      )}
      {recUrl && (
        <div className="mt-3">
          <video src={recUrl} controls className="w-full rounded-lg bg-black max-h-44" />
          <a href={recUrl} download={`waveify-${Date.now()}.webm`} className="mt-2 w-full py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-200 text-xs font-bold hover:border-rose-500/40 transition-colors flex items-center justify-center gap-1.5">
            <Download size={12} /> İndir
          </a>
        </div>
      )}
    </div>
  )
}
