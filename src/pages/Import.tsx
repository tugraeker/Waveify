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
  { match: 'spotify.com', label: 'Spotify', color: 'text-green-400' },
]

export default function Import() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ title: string; artist: string; cover?: string } | null>(null)

  const platform = PLATFORMS.find((p) => url.toLowerCase().includes(p.match))

  async function handleImport() {
    if (!url.trim() || !user) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Clean URL - remove playlist/radio params
      let cleanUrl = url.trim()
      const vidMatch = cleanUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      const videoId = vidMatch ? vidMatch[1] : null
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
        if (videoId) cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
      }

      // Step 1: Fetch metadata via oEmbed
      let oembedUrl = ''
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
        oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      } else if (cleanUrl.includes('soundcloud.com')) {
        oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      } else {
        throw new Error('Desteklenen platformlar: YouTube, SoundCloud')
      }

      const metaRes = await fetch(oembedUrl)
      const meta = metaRes.ok ? await metaRes.json() : {}

      const metaTitle = meta.title || ''
      let metaArtist = meta.author_name || ''
      const metaCover = meta.thumbnail_url || ''

      // Parse YouTube title
      let finalTitle = metaTitle
      if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
        if (metaTitle.includes(' - ')) {
          const parts = metaTitle.split(' - ')
          finalTitle = parts.slice(1).join(' - ').trim()
          metaArtist = parts[0].trim()
        }
      }

      setResult({ title: finalTitle, artist: metaArtist, cover: metaCover })

      // Step 2: Download audio via server
      setLoading(false)
      setImporting(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('Oturum süresi dolmuş')

      const res = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          userId: user.id,
          title: finalTitle,
          artist: metaArtist,
          coverUrl: metaCover,
          accessToken,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import başarısız')

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
            <p className="text-sm text-surface-400">YouTube veya SoundCloud'dan otomatik içe aktar</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
            <Button variant="primary" onClick={handleImport} disabled={loading || importing || !url.trim() || !user}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : importing ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {loading ? 'Bilgiler alınıyor...' : importing ? 'Aktarılıyor...' : 'Aktar'}
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
