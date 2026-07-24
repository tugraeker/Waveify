import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { Link2, Music2, Check, Globe, Loader2, AlertCircle } from 'lucide-react'

export default function Import() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ title: string; artist: string; cover?: string } | null>(null)

  async function downloadAndUpload() {
    if (!user) return
    const vidMatch = url.trim().match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const videoId = vidMatch ? vidMatch[1] : null
    if (!videoId) { setError('Geçersiz YouTube URL'); return }

    // Check if running in Electron with the API
    const ea = (window as any).electronAPI
    if (!ea?.getYouTubeAudio) { setError('Bu özellik yalnızca Waveify uygulamasında çalışır'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const { buffer, title, artist, duration, coverUrl } = await (window as any).electronAPI.getYouTubeAudio(videoId)

      setResult({ title: title || 'Bilinmeyen', artist: artist || 'Bilinmeyen', cover: coverUrl })
      setLoading(false)
      setImporting(true)

      const audioBlob = new Blob([buffer], { type: 'audio/mpeg' })
      if (audioBlob.size < 10240) throw new Error('İndirilen ses dosyası çok küçük')

      const audioPath = `${user.id}/${Date.now()}_import.mp3`
      const { error: uploadErr } = await supabase.storage
        .from('songs')
        .upload(audioPath, audioBlob, { contentType: 'audio/mpeg', upsert: true })
      if (uploadErr) throw new Error(`Yükleme hatası: ${uploadErr.message}`)

      const { data: { publicUrl: audioUrlFinal } } = supabase.storage.from('songs').getPublicUrl(audioPath)

      // Upload cover
      let finalCoverUrl = coverUrl || ''
      if (coverUrl && coverUrl.startsWith('http')) {
        try {
          const coverRes = await fetch(coverUrl)
          if (coverRes.ok) {
            const coverBlob = await coverRes.blob()
            const coverPath = `${user.id}/covers/${Date.now()}.jpg`
            const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverBlob, { contentType: 'image/jpeg', upsert: true })
            if (!coverErr) {
              const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
              finalCoverUrl = publicUrl
            }
          }
        } catch {}
      }

      const { error: dbError } = await supabase.from('songs').insert([{
        user_id: user.id,
        title: title || 'Bilinmeyen Şarkı',
        artist: artist || 'Bilinmeyen Sanatçı',
        duration: duration || 0,
        audio_url: audioUrlFinal,
        cover_url: finalCoverUrl || null,
      }] as any)

      if (dbError) throw new Error(`Veritabanı hatası: ${dbError.message}`)
      navigate('/library')
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
      setImporting(false)
    }
  }

  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wave-500 to-wave-400 flex items-center justify-center shadow-lg shadow-wave-500/20">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">İçe Aktar</h1>
            <p className="text-sm text-surface-400">YouTube'dan otomatik içe aktar</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && downloadAndUpload()}
            />
            <Button variant="primary" onClick={downloadAndUpload} disabled={loading || importing || !url.trim() || !user}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : importing ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {loading ? 'Bilgiler alınıyor...' : importing ? 'İndiriliyor...' : 'Aktar'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="glass rounded-2xl p-5 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-800 border border-surface-700 flex-shrink-0 flex items-center justify-center">
                  {result.cover ? (
                    <img src={result.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 size={24} className="text-surface-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{result.title || 'Bilinmeyen Şarkı'}</p>
                  <p className="text-xs text-surface-400 truncate">{result.artist || 'Bilinmeyen Sanatçı'}</p>
                  {importing && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-wave-400">
                      <Loader2 size={12} className="animate-spin" />
                      Ses indiriliyor ve yükleniyor...
                    </div>
                  )}
                  {!importing && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                      <Check size={12} />
                      Hazır
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!user && (
            <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
              <AlertCircle size={16} />
              İçe aktarmak için giriş yapmalısın
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
