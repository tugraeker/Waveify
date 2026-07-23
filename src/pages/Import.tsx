import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { Link2, Music2, Check, Globe, Loader2, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const PLATFORMS: { match: string; label: string; color: string }[] = [
  { match: 'youtube.com', label: 'YouTube', color: 'text-red-400' },
  { match: 'youtu.be', label: 'YouTube', color: 'text-red-400' },
  { match: 'soundcloud.com', label: 'SoundCloud', color: 'text-orange-400' },
]

const INV_INSTANCES = ['https://inv.nadeko.net', 'https://yewtu.be', 'https://invidious.snopyta.org']

export default function Import() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ title: string; artist: string; cover?: string } | null>(null)

  const platform = PLATFORMS.find((p) => url.toLowerCase().includes(p.match))

  async function downloadAndUpload() {
    if (!user) return
    const vidMatch = url.trim().match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const videoId = vidMatch ? vidMatch[1] : null
    if (!videoId) { setError('Geçersiz YouTube URL'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Step 1: Get metadata from oEmbed (works with CORS)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
      const oembedRes = await fetch(oembedUrl)
      const oembed = oembedRes.ok ? await oembedRes.json() : {}
      let songTitle = oembed.title || ''
      let songArtist = oembed.author_name || ''
      let songCover = oembed.thumbnail_url || ''

      if (songTitle.includes(' - ')) {
        const parts = songTitle.split(' - ')
        songTitle = parts.slice(1).join(' - ').trim()
        songArtist = parts[0].trim()
      }

      setResult({ title: songTitle, artist: songArtist, cover: songCover })
      setLoading(false)
      setImporting(true)

      // Step 2: Get audio URL from invidious API (CORS-enabled)
      let audioUrl = ''
      let duration = 0

      for (const instance of INV_INSTANCES) {
        if (audioUrl) break
        try {
          const apiRes = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(10000) })
          if (!apiRes.ok) continue
          const data = await apiRes.json()
          const formats = data?.adaptiveFormats || []
          const audioFormats = formats.filter((f: any) => f.type?.startsWith('audio/mp4') || f.type?.startsWith('audio/webm'))
          if (audioFormats.length > 0) {
            audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))
            audioUrl = audioFormats[0].url
            duration = data?.lengthSeconds ? parseInt(data.lengthSeconds) : 0
            // Get high quality cover from invidious if oembed didn't have it
            if (!songCover && data?.authorThumbnails?.length) {
              songCover = data.authorThumbnails[data.authorThumbnails.length - 1]?.url || ''
            }
            if (!songCover && data?.thumbnailUrl) songCover = data.thumbnailUrl
          }
        } catch {}
      }

      // Fallback: try fetching YouTube page through CORS proxy
      if (!audioUrl) {
        const proxyUrls = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
          `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        ]
        for (const proxyUrl of proxyUrls) {
          if (audioUrl) break
          try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) })
            if (!res.ok) continue
            const html = await res.text()
            const marker = 'ytInitialPlayerResponse = '
            const idx = html.indexOf(marker)
            if (idx === -1) continue
            const start = idx + marker.length
            let depth = 0, end = start
            for (let i = start; i < html.length; i++) {
              if (html[i] === '{') depth++
              else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
            }
            if (end <= start) continue
            const pr = JSON.parse(html.slice(start, end))
            const formats = pr?.streamingData?.adaptiveFormats || []
            const af = formats.filter((f: any) => f.mimeType?.startsWith('audio/'))
            if (af.length > 0) {
              af.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))
              audioUrl = af[0].url || ''
              duration = parseInt(pr?.videoDetails?.lengthSeconds || '0')
              if (!songCover) {
                const thumbs = pr?.videoDetails?.thumbnail?.thumbnails
                if (thumbs?.length) songCover = thumbs[thumbs.length - 1].url
              }
            }
          } catch {}
        }
      }

      if (!audioUrl) throw new Error('Ses URL\'i alınamadı')

      // Step 3: Download audio in browser (CDN URLs are CORS-enabled)
      const audioRes = await fetch(audioUrl, {
        headers: { 'Referer': 'https://www.youtube.com/' },
      })
      if (!audioRes.ok) throw new Error(`Ses indirilemedi: ${audioRes.status}`)
      const audioBlob = await audioRes.blob()
      if (audioBlob.size < 10240) throw new Error('İndirilen ses dosyası çok küçük')

      // Step 4: Convert to base64 and upload to server
      const buffer = await audioBlob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const audioBase64 = btoa(binary)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token || ''
      if (!accessToken) throw new Error('Oturum süresi dolmuş')

      // Try to update metadata from player response if we got it
      const uploadRes = await fetch(`${API_URL}/api/upload-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          title: songTitle,
          artist: songArtist,
          coverUrl: songCover,
          duration,
          userId: user.id,
          accessToken,
        }),
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Yükleme başarısız')
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

          {platform && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-surface-500">Tespit edilen platform:</span>
              <span className={`font-semibold ${platform.color}`}>{platform.label}</span>
            </div>
          )}

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
