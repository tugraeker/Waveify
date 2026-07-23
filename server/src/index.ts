import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import fs from 'fs'
import { setupSocketHandlers } from './socket/syncHandler.js'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

const corsOrigin = process.env.CORS_ORIGIN || '*'
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: ['GET', 'POST'],
  },
})

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kjyjjqxqsbmrravhcuoc.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqeWpqcXhxc2JtcnJhdmhjdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzUwNDgsImV4cCI6MjEwMDE1MTA0OH0.fB6dlkOcT-fPW6bsTvwj0XnbUbLiKmhzz4LxQ8r28g8'
const isServiceKey = process.env.SUPABASE_SERVICE_KEY ? true : false

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/rooms', (_req, res) => {
  const rooms = Array.from(io.sockets.adapter.rooms.entries())
    .filter(([key]) => key.startsWith('room:'))
    .map(([id, sockets]) => {
      const roomName = id.replace('room:', '')
      return {
        id: roomName,
        listenerCount: sockets.size,
      }
    })
  res.json(rooms)
})

app.post('/api/import', async (req, res) => {
  try {
    const { url, userId, title, artist, coverUrl, accessToken } = req.body
    if (!url || !userId) return res.status(400).json({ error: 'URL ve kullanıcı ID gerekli' })

    // Create Supabase client - use service key if available, otherwise use user token
    let supabase: ReturnType<typeof createClient>
    if (isServiceKey) {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    } else {
      if (!accessToken) return res.status(400).json({ error: 'Oturum tokeni gerekli' })
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    }

    // Get video ID from URL
    let videoId = ''
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (match) videoId = match[1]
    }
    if (!videoId) return res.status(400).json({ error: 'Geçersiz YouTube URL\'si' })

    // Try multiple download methods in order
    let audioBuffer: Buffer | null = null
    let finalTitle = title || ''
    let finalArtist = artist || ''
    let duration = 0

    // Clean URL (remove playlist/radio params)
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Method 1: Direct YouTube page scraping (bypasses yt-dlp bot detection)
    // Fetches the player response directly from YouTube's webpage and extracts audio URL
    if (!audioBuffer) {
      try {
        console.log('[Import] Method 1: Direct YouTube page scrape...')
        const pageRes = await fetch(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        })
        const html = await pageRes.text()
        // Try to extract ytInitialPlayerResponse from the page
        const ytMatch = html.match(/ytInitialPlayerResponse\s*=\s*({[^<]+?});\s*(?:var|window|<\/)/)
        if (ytMatch) {
          const playerResponse = JSON.parse(ytMatch[1])
          const formats = playerResponse?.streamingData?.adaptiveFormats || []
          const audioFormats = formats.filter((f: any) => f.mimeType?.startsWith('audio/'))
          if (audioFormats.length > 0) {
            // Pick the highest bitrate audio
            audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))
            const best = audioFormats[0]
            const audioUrl = best.url || best.signatureCipher || ''
            let finalUrl = audioUrl
            if (audioUrl.includes('s=') || !audioUrl.startsWith('http')) {
              // Need to decrypt signature - skip, use next method
            } else {
              console.log('[Import] Got audio URL from player response')
              const dlRes = await fetch(finalUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
              if (dlRes.ok) {
                audioBuffer = Buffer.from(await dlRes.arrayBuffer())
                finalTitle = title || playerResponse?.videoDetails?.title || ''
                finalArtist = artist || playerResponse?.videoDetails?.author || ''
                duration = parseInt(playerResponse?.videoDetails?.lengthSeconds || '0')
              }
            }
          }
        }
        if (!audioBuffer) console.log('[Import] Method 1 failed: could not extract audio URL')
      } catch (e: any) { console.log('[Import] Method 1 failed:', e?.message?.slice(0, 100)) }
    }

    // Method 2: Try youtube-dl-exec (yt-dlp) - fallback with cookies from env
    if (!audioBuffer) {
      try {
        const youtubedl = await import('youtube-dl-exec').then(m => m.default)
        console.log('[Import] Method 2: yt-dlp...')
        const ytArgs: any = {
          extractAudio: true,
          audioFormat: 'mp3',
          output: '-',
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          noPlaylist: true,
          socketTimeout: 30,
          retries: 3,
        }
        // Add cookies from env if available
        if (process.env.YT_COOKIES) {
          ytArgs.cookies = '/tmp/yt_cookies.txt'
          fs.writeFileSync('/tmp/yt_cookies.txt', process.env.YT_COOKIES)
        }
        const audioProcess = youtubedl.exec(cleanUrl, ytArgs)
        const killTimer = setTimeout(() => { try { audioProcess.kill() } catch {} }, 120_000)
        audioProcess.stderr?.on('data', (d: Buffer) => console.log('[yt-dlp]', d.toString().trim()))
        const audioChunks: Buffer[] = []
        for await (const chunk of audioProcess.stdout!) {
          audioChunks.push(Buffer.from(chunk))
        }
        clearTimeout(killTimer)
        console.log('[Import] yt-dlp downloaded', audioChunks.length, 'bytes')
        if (audioChunks.length > 0) audioBuffer = Buffer.concat(audioChunks)
        // Try to get metadata
        try {
          const metaProcess = youtubedl.exec(cleanUrl, { dumpSingleJson: true, noCheckCertificates: true, noWarnings: true, noPlaylist: true })
          let metaOut = ''
          for await (const chunk of metaProcess.stdout!) { metaOut += chunk.toString() }
          const json = JSON.parse(metaOut)
          finalTitle = title || json.title || ''
          finalArtist = artist || json.artist || json.uploader || ''
          duration = json.duration || 0
        } catch {}
      } catch (e: any) { console.log('[Import] yt-dlp failed:', e?.message?.slice(0, 200)) }
    }

    // Method 3: Try @distube/ytdl-core
    if (!audioBuffer) {
      try {
        console.log('[Import] Method 3: @distube/ytdl-core...')
        const ytdl = await import('@distube/ytdl-core').then(m => m.default)
        const info = await ytdl.getInfo(videoId)
        const format = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio', filter: 'audioonly' })
        if (format) {
          const stream = ytdl(videoId, { format })
          const chunks: Buffer[] = []
          for await (const chunk of stream) { chunks.push(chunk as Buffer) }
          audioBuffer = Buffer.concat(chunks)
          finalTitle = title || info.videoDetails.title || ''
          finalArtist = artist || info.videoDetails.author?.name || ''
          duration = info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : 0
        }
      } catch (e: any) { console.log('[Import] @distube/ytdl-core failed:', e?.message?.slice(0, 100)) }
    }

    // Method 4: Try invidious instances (privacy-friendly YouTube proxies)
    const INVIDIOUS_INSTANCES = [
      'https://inv.nadeko.net',
      'https://yewtu.be',
      'https://invidious.snopyta.org',
      'https://vid.puffyan.us',
    ]
    for (const instance of INVIDIOUS_INSTANCES) {
      if (audioBuffer) break
      try {
        console.log('[Import] Method 4: Invidious', instance)
        const invRes = await fetch(`${instance}/latest_version?id=${videoId}&itag=140&local=true`, {
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
        })
        const location = invRes.headers.get('location')
        if (location) {
          const dlRes = await fetch(location, { signal: AbortSignal.timeout(60000) })
          if (dlRes.ok) audioBuffer = Buffer.from(await dlRes.arrayBuffer())
        }
      } catch (e: any) { console.log('[Import] Invidious failed:', instance, e?.message?.slice(0, 60)) }
    }

    // Method 5: Try vevioz API
    if (!audioBuffer) {
      try {
        console.log('[Import] Method 5: vevioz...')
        const apiRes = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          redirect: 'follow',
          signal: AbortSignal.timeout(60000),
        })
        if (apiRes.ok) audioBuffer = Buffer.from(await apiRes.arrayBuffer())
      } catch (e: any) { console.log('[Import] vevioz failed:', e?.message?.slice(0, 60)) }
    }

    // Method 6: Try cobalt.tools API
    if (!audioBuffer) {
      try {
        console.log('[Import] Method 6: cobalt.tools...')
        const cobaltRes = await fetch('https://api.cobalt.tools/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url: cleanUrl, videoQuality: '144', filenameStyle: 'basic' }),
          signal: AbortSignal.timeout(30000),
        })
        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json()
          if (cobaltData.url) {
            const dlRes = await fetch(cobaltData.url, { signal: AbortSignal.timeout(60000) })
            if (dlRes.ok) audioBuffer = Buffer.from(await dlRes.arrayBuffer())
          }
        }
      } catch (e: any) { console.log('[Import] cobalt.tools failed:', e?.message?.slice(0, 60)) }
    }

    if (!audioBuffer) throw new Error('Ses dosyası indirilemedi (tüm yöntemler başarısız)')

    // Upload to Supabase
    const audioPath = `${userId}/${Date.now()}_import.mp3`
    const { error: uploadErr } = await supabase.storage
      .from('songs')
      .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadErr) throw new Error(`Yükleme hatası: ${uploadErr.message}`)

    const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath)

    // Try to download and upload cover
    let finalCoverUrl = coverUrl || ''
    if (coverUrl && coverUrl.startsWith('http')) {
      try {
        const coverRes = await fetch(coverUrl)
        if (coverRes.ok) {
          const coverBlob = await coverRes.blob()
          const coverPath = `${userId}/covers/${Date.now()}.jpg`
          const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverBlob, { contentType: 'image/jpeg', upsert: true })
          if (!coverErr) {
            const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
            finalCoverUrl = publicUrl
          }
        }
      } catch {}
    }

    const { data, error: dbError } = await supabase.from('songs').insert([{
      user_id: userId,
      title: title || 'Bilinmeyen Şarkı',
      artist: artist || 'Bilinmeyen Sanatçı',
      duration,
      audio_url: audioUrl,
      cover_url: finalCoverUrl || null,
    }] as any).select().single()

    if (dbError) throw new Error(`Veritabanı hatası: ${dbError.message}`)

    res.json({ success: true, song: data })
  } catch (e: any) {
    console.error('Import error:', e)
    res.status(500).json({ error: e.message || 'Import başarısız' })
  }
})

setupSocketHandlers(io)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Sesli server running on port ${PORT}`)
})
