import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import fs from 'fs';
import { setupSocketHandlers } from './socket/syncHandler.js';
import { createClient } from '@supabase/supabase-js';
dotenv.config();
const app = express();
const httpServer = createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || '*';
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin === '*' ? true : corsOrigin.split(','),
        methods: ['GET', 'POST'],
    },
});
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kjyjjqxqsbmrravhcuoc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqeWpqcXhxc2JtcnJhdmhjdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzUwNDgsImV4cCI6MjEwMDE1MTA0OH0.fB6dlkOcT-fPW6bsTvwj0XnbUbLiKmhzz4LxQ8r28g8';
const isServiceKey = process.env.SUPABASE_SERVICE_KEY ? true : false;
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/rooms', (_req, res) => {
    const rooms = Array.from(io.sockets.adapter.rooms.entries())
        .filter(([key]) => key.startsWith('room:'))
        .map(([id, sockets]) => {
        const roomName = id.replace('room:', '');
        return {
            id: roomName,
            listenerCount: sockets.size,
        };
    });
    res.json(rooms);
});
app.post('/api/import', async (req, res) => {
    try {
        const { url, userId, title, artist, coverUrl, accessToken } = req.body;
        if (!url || !userId)
            return res.status(400).json({ error: 'URL ve kullanıcı ID gerekli' });
        // Create Supabase client - use service key if available, otherwise use user token
        let supabase;
        if (isServiceKey) {
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        else {
            if (!accessToken)
                return res.status(400).json({ error: 'Oturum tokeni gerekli' });
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                global: { headers: { Authorization: `Bearer ${accessToken}` } },
            });
        }
        // Get video ID from URL
        let videoId = '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (match)
                videoId = match[1];
        }
        if (!videoId)
            return res.status(400).json({ error: 'Geçersiz YouTube URL\'si' });
        // Try multiple download methods in order
        let audioBuffer = null;
        let finalTitle = title || '';
        let finalArtist = artist || '';
        let duration = 0;
        // Clean URL (remove playlist/radio params)
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Method 1: Direct YouTube page scraping from the user's browser IP
        // (server sends a proxy URL back, the page is fetched client-side)
        // Server-side fallback: try fetching with a rotating user-agent
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 1: Direct YouTube page scrape...');
                const pageRes = await fetch(cleanUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                });
                if (!pageRes.ok) {
                    console.log('[Import] Method 1 HTTP', pageRes.status, pageRes.statusText);
                    const text = await pageRes.text();
                    console.log('[Import] Method 1 response preview:', text.slice(0, 300));
                }
                else {
                    const html = await pageRes.text();
                    console.log('[Import] Method 1 got', html.length, 'bytes');
                    const marker = 'ytInitialPlayerResponse = ';
                    const idx = html.indexOf(marker);
                    if (idx !== -1) {
                        const start = idx + marker.length;
                        let depth = 0;
                        let end = start;
                        for (let i = start; i < html.length; i++) {
                            if (html[i] === '{')
                                depth++;
                            else if (html[i] === '}') {
                                depth--;
                                if (depth === 0) {
                                    end = i + 1;
                                    break;
                                }
                            }
                        }
                        if (end > start) {
                            const jsonStr = html.slice(start, end);
                            const playerResponse = JSON.parse(jsonStr);
                            const formats = playerResponse?.streamingData?.adaptiveFormats || [];
                            const audioFormats = formats.filter((f) => f.mimeType?.startsWith('audio/'));
                            if (audioFormats.length > 0) {
                                audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                                const best = audioFormats[0];
                                const audioUrl = best.url || '';
                                if (audioUrl.startsWith('http')) {
                                    console.log('[Import] Got audio URL from player response, bitrate:', best.bitrate);
                                    const dlRes = await fetch(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.youtube.com/' } });
                                    if (dlRes.ok) {
                                        audioBuffer = Buffer.from(await dlRes.arrayBuffer());
                                        finalTitle = title || playerResponse?.videoDetails?.title || '';
                                        finalArtist = artist || playerResponse?.videoDetails?.author || '';
                                        duration = parseInt(playerResponse?.videoDetails?.lengthSeconds || '0');
                                        console.log('[Import] Method 1 success:', finalTitle);
                                    }
                                    else
                                        console.log('[Import] Method 1 audio download failed:', dlRes.status);
                                }
                                else
                                    console.log('[Import] Method 1 no audio URL found');
                            }
                            else {
                                // Check for playability status
                                const status = playerResponse?.playabilityStatus?.status;
                                console.log('[Import] Method 1 playability:', status);
                            }
                        }
                    }
                    else {
                        // Check if the page is a blocked/bot page
                        if (html.includes('captcha') || html.includes('unusual traffic'))
                            console.log('[Import] Method 1: page has captcha/bot challenge');
                        else
                            console.log('[Import] Method 1: ytInitialPlayerResponse not found in page');
                    }
                }
                if (!audioBuffer)
                    console.log('[Import] Method 1 failed');
            }
            catch (e) {
                console.log('[Import] Method 1 failed:', e?.message?.slice(0, 100));
            }
        }
        // Method 1b: Fetch YouTube page through a CORS proxy (bypasses Render IP)
        if (!audioBuffer) {
            for (const proxyBase of ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?']) {
                if (audioBuffer)
                    break;
                try {
                    console.log('[Import] Method 1b: proxy', proxyBase.slice(0, 30));
                    const proxyUrl = proxyBase + encodeURIComponent(cleanUrl);
                    const prRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
                    if (!prRes.ok)
                        continue;
                    const html = await prRes.text();
                    const marker = 'ytInitialPlayerResponse = ';
                    const idx = html.indexOf(marker);
                    if (idx === -1)
                        continue;
                    const start = idx + marker.length;
                    let depth = 0, end = start;
                    for (let i = start; i < html.length; i++) {
                        if (html[i] === '{')
                            depth++;
                        else if (html[i] === '}') {
                            depth--;
                            if (depth === 0) {
                                end = i + 1;
                                break;
                            }
                        }
                    }
                    if (end <= start)
                        continue;
                    const playerResponse = JSON.parse(html.slice(start, end));
                    const formats = playerResponse?.streamingData?.adaptiveFormats || [];
                    const audioFormats = formats.filter((f) => f.mimeType?.startsWith('audio/'));
                    if (!audioFormats.length)
                        continue;
                    audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                    const audioUrl = audioFormats[0].url;
                    if (!audioUrl?.startsWith('http'))
                        continue;
                    console.log('[Import] Method 1b got audio URL, bitrate:', audioFormats[0].bitrate);
                    const dlRes = await fetch(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.youtube.com/' } });
                    if (dlRes.ok) {
                        audioBuffer = Buffer.from(await dlRes.arrayBuffer());
                        finalTitle = title || playerResponse?.videoDetails?.title || '';
                        finalArtist = artist || playerResponse?.videoDetails?.author || '';
                        duration = parseInt(playerResponse?.videoDetails?.lengthSeconds || '0');
                        console.log('[Import] Method 1b success:', finalTitle);
                    }
                }
                catch (e) {
                    console.log('[Import] Method 1b failed:', e?.message?.slice(0, 80));
                }
            }
        }
        // Method 2: Try invidious instances (bypass YouTube blocks via proxy frontends)
        const INVIDIOUS_INSTANCES = [
            'https://inv.nadeko.net',
            'https://yewtu.be',
            'https://invidious.snopyta.org',
            'https://vid.puffyan.us',
        ];
        const INV_ITAGS = ['140', '251', '250', '139'];
        for (const instance of INVIDIOUS_INSTANCES) {
            if (audioBuffer)
                break;
            for (const itag of INV_ITAGS) {
                if (audioBuffer)
                    break;
                try {
                    console.log('[Import] Method 2: Invidious', instance, 'itag', itag);
                    const invRes = await fetch(`${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`, {
                        redirect: 'follow',
                        signal: AbortSignal.timeout(15000),
                    });
                    if (!invRes.ok)
                        continue;
                    const ct = invRes.headers.get('content-type') || '';
                    if (!ct.includes('audio') && !ct.includes('octet-stream') && !ct.includes('binary'))
                        continue;
                    const buf = Buffer.from(await invRes.arrayBuffer());
                    if (buf.length > 50000) {
                        audioBuffer = buf;
                        console.log('[Import] Method 2 success:', instance, 'itag', itag, 'size:', buf.length);
                    }
                }
                catch (e) {
                    console.log('[Import] Method 2 failed:', instance, 'itag', itag, e?.message?.slice(0, 50));
                }
            }
        }
        // Method 3: Try vevioz API
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 3: vevioz...');
                const apiRes = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
                    redirect: 'follow',
                    signal: AbortSignal.timeout(60000),
                });
                if (apiRes.ok) {
                    audioBuffer = Buffer.from(await apiRes.arrayBuffer());
                    console.log('[Import] Method 3 success');
                }
            }
            catch (e) {
                console.log('[Import] Method 3 failed:', e?.message?.slice(0, 60));
            }
        }
        // Method 4: Try youtube-dl-exec (yt-dlp) - process-safe
        if (!audioBuffer) {
            try {
                const youtubedl = await import('youtube-dl-exec').then(m => m.default);
                console.log('[Import] Method 4: yt-dlp...');
                const ytArgs = {
                    extractAudio: true,
                    audioFormat: 'mp3',
                    output: '-',
                    noCheckCertificates: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    noPlaylist: true,
                    socketTimeout: 30,
                    retries: 3,
                    extractorArgs: 'youtube:player_client=android,youtube:player_client=web',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                };
                if (process.env.YT_COOKIES) {
                    ytArgs.cookies = '/tmp/yt_cookies.txt';
                    fs.writeFileSync('/tmp/yt_cookies.txt', process.env.YT_COOKIES);
                }
                const audioBuffer2 = await new Promise((resolve) => {
                    const ap = youtubedl.exec(cleanUrl, ytArgs);
                    const chunks = [];
                    const timer = setTimeout(() => { try {
                        ap.kill();
                    }
                    catch { } ; resolve(null); }, 120_000);
                    ap.on('error', () => resolve(null));
                    ap.stderr?.on('data', (d) => console.log('[yt-dlp]', d.toString().trim()));
                    ap.stdout?.on('data', (d) => chunks.push(d));
                    ap.stdout?.on('end', () => { clearTimeout(timer); resolve(chunks.length > 0 ? Buffer.concat(chunks) : null); });
                    ap.on('close', (code) => { if (code !== 0 && chunks.length === 0)
                        resolve(null); });
                });
                if (audioBuffer2) {
                    audioBuffer = audioBuffer2;
                    console.log('[Import] Method 4 success');
                }
            }
            catch (e) {
                console.log('[Import] Method 4 failed:', e?.message?.slice(0, 200));
            }
        }
        // Method 5: Try @distube/ytdl-core
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 5: @distube/ytdl-core...');
                const ytdl = await import('@distube/ytdl-core').then(m => m.default);
                const info = await ytdl.getInfo(videoId);
                const format = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio', filter: 'audioonly' });
                if (format) {
                    const stream = ytdl(videoId, { format });
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    audioBuffer = Buffer.concat(chunks);
                    finalTitle = title || info.videoDetails.title || '';
                    finalArtist = artist || info.videoDetails.author?.name || '';
                    duration = info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : 0;
                    console.log('[Import] Method 5 success');
                }
            }
            catch (e) {
                console.log('[Import] Method 5 failed:', e?.message?.slice(0, 100));
            }
        }
        // Method 6: Try cobalt.tools API
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 6: cobalt.tools...');
                const cobaltRes = await fetch('https://api.cobalt.tools/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ url: cleanUrl, videoQuality: '144', filenameStyle: 'basic' }),
                    signal: AbortSignal.timeout(30000),
                });
                if (cobaltRes.ok) {
                    const cobaltData = await cobaltRes.json();
                    if (cobaltData.url) {
                        const dlRes = await fetch(cobaltData.url, { signal: AbortSignal.timeout(60000) });
                        if (dlRes.ok) {
                            audioBuffer = Buffer.from(await dlRes.arrayBuffer());
                            console.log('[Import] Method 6 success');
                        }
                    }
                }
            }
            catch (e) {
                console.log('[Import] Method 6 failed:', e?.message?.slice(0, 60));
            }
        }
        // Method 5: Try vevioz API
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 5: vevioz...');
                const apiRes = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
                    redirect: 'follow',
                    signal: AbortSignal.timeout(60000),
                });
                if (apiRes.ok)
                    audioBuffer = Buffer.from(await apiRes.arrayBuffer());
            }
            catch (e) {
                console.log('[Import] vevioz failed:', e?.message?.slice(0, 60));
            }
        }
        // Method 6: Try cobalt.tools API
        if (!audioBuffer) {
            try {
                console.log('[Import] Method 6: cobalt.tools...');
                const cobaltRes = await fetch('https://api.cobalt.tools/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ url: cleanUrl, videoQuality: '144', filenameStyle: 'basic' }),
                    signal: AbortSignal.timeout(30000),
                });
                if (cobaltRes.ok) {
                    const cobaltData = await cobaltRes.json();
                    if (cobaltData.url) {
                        const dlRes = await fetch(cobaltData.url, { signal: AbortSignal.timeout(60000) });
                        if (dlRes.ok)
                            audioBuffer = Buffer.from(await dlRes.arrayBuffer());
                    }
                }
            }
            catch (e) {
                console.log('[Import] cobalt.tools failed:', e?.message?.slice(0, 60));
            }
        }
        if (!audioBuffer)
            throw new Error('Ses dosyası indirilemedi (tüm yöntemler başarısız)');
        // Upload to Supabase
        const audioPath = `${userId}/${Date.now()}_import.mp3`;
        const { error: uploadErr } = await supabase.storage
            .from('songs')
            .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
        if (uploadErr)
            throw new Error(`Yükleme hatası: ${uploadErr.message}`);
        const { data: { publicUrl: audioUrl } } = supabase.storage.from('songs').getPublicUrl(audioPath);
        // Try to download and upload cover
        let finalCoverUrl = coverUrl || '';
        if (coverUrl && coverUrl.startsWith('http')) {
            try {
                const coverRes = await fetch(coverUrl);
                if (coverRes.ok) {
                    const coverBlob = await coverRes.blob();
                    const coverPath = `${userId}/covers/${Date.now()}.jpg`;
                    const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverBlob, { contentType: 'image/jpeg', upsert: true });
                    if (!coverErr) {
                        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);
                        finalCoverUrl = publicUrl;
                    }
                }
            }
            catch { }
        }
        const { data, error: dbError } = await supabase.from('songs').insert([{
                user_id: userId,
                title: title || 'Bilinmeyen Şarkı',
                artist: artist || 'Bilinmeyen Sanatçı',
                duration,
                audio_url: audioUrl,
                cover_url: finalCoverUrl || null,
            }]).select().single();
        if (dbError)
            throw new Error(`Veritabanı hatası: ${dbError.message}`);
        res.json({ success: true, song: data });
    }
    catch (e) {
        console.error('Import error:', e);
        res.status(500).json({ error: e.message || 'Import başarısız' });
    }
});
// Client-side videoId endpoint: accepts videoId, downloads via proxy methods on server
app.post('/api/import-by-id', async (req, res) => {
    try {
        const { videoId, coverUrl, userId, title, artist, accessToken } = req.body;
        if (!videoId || !userId)
            return res.status(400).json({ error: 'videoId ve userId gerekli' });
        let supabase;
        if (isServiceKey) {
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        else {
            if (!accessToken)
                return res.status(400).json({ error: 'Oturum tokeni gerekli' });
            supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                global: { headers: { Authorization: `Bearer ${accessToken}` } },
            });
        }
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        let audioBuffer = null;
        let finalTitle = title || '';
        let finalArtist = artist || '';
        let duration = 0;
        let finalCoverUrl = coverUrl || '';
        // Method A: Invidious instances (try multiple audio formats)
        const INVIDIOUS_INSTANCES = [
            'https://inv.nadeko.net',
            'https://yewtu.be',
            'https://invidious.snopyta.org',
            'https://vid.puffyan.us',
        ];
        const INV_ITAGS = ['251', '140', '250', '139'];
        for (const instance of INVIDIOUS_INSTANCES) {
            if (audioBuffer)
                break;
            for (const itag of INV_ITAGS) {
                if (audioBuffer)
                    break;
                try {
                    console.log('[Import-ByID] Invidious', instance, 'itag', itag);
                    const invRes = await fetch(`${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`, {
                        redirect: 'follow', signal: AbortSignal.timeout(20000),
                    });
                    if (!invRes.ok)
                        continue;
                    const ct = invRes.headers.get('content-type') || '';
                    if (!ct.includes('audio') && !ct.includes('octet-stream') && !ct.includes('binary') && !ct.includes('media'))
                        continue;
                    const buf = Buffer.from(await invRes.arrayBuffer());
                    if (buf.length > 50000) {
                        audioBuffer = buf;
                        console.log('[Import-ByID] Invidious success:', instance, 'itag', itag, 'size:', buf.length);
                    }
                }
                catch (e) {
                    console.log('[Import-ByID] Invidious failed:', instance, 'itag', itag, e?.message?.slice(0, 50));
                }
            }
        }
        // Method B: vevioz
        if (!audioBuffer) {
            try {
                console.log('[Import-ByID] vevioz...');
                const apiRes = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
                    redirect: 'follow', signal: AbortSignal.timeout(60000),
                });
                if (apiRes.ok) {
                    audioBuffer = Buffer.from(await apiRes.arrayBuffer());
                    console.log('[Import-ByID] vevioz success, size:', audioBuffer.length);
                }
            }
            catch (e) {
                console.log('[Import-ByID] vevioz failed:', e?.message?.slice(0, 60));
            }
        }
        // Method C: cobalt.tools
        if (!audioBuffer) {
            try {
                console.log('[Import-ByID] cobalt.tools...');
                const cobaltRes = await fetch('https://api.cobalt.tools/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ url: cleanUrl, videoQuality: '144', filenameStyle: 'basic' }),
                    signal: AbortSignal.timeout(30000),
                });
                if (cobaltRes.ok) {
                    const cobaltData = await cobaltRes.json();
                    if (cobaltData.url) {
                        const dlRes = await fetch(cobaltData.url, { signal: AbortSignal.timeout(60000) });
                        if (dlRes.ok) {
                            audioBuffer = Buffer.from(await dlRes.arrayBuffer());
                            console.log('[Import-ByID] cobalt success');
                        }
                    }
                }
            }
            catch (e) {
                console.log('[Import-ByID] cobalt failed:', e?.message?.slice(0, 60));
            }
        }
        // Method D: yt-dlp with crash-safe promise
        if (!audioBuffer) {
            try {
                const youtubedl = await import('youtube-dl-exec').then(m => m.default);
                const ytArgs = {
                    extractAudio: true, audioFormat: 'mp3', output: '-',
                    noCheckCertificates: true, noWarnings: true, preferFreeFormats: true, noPlaylist: true,
                    socketTimeout: 30, retries: 3,
                    extractorArgs: 'youtube:player_client=android,youtube:player_client=web',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                };
                if (process.env.YT_COOKIES) {
                    ytArgs.cookies = '/tmp/yt_cookies.txt';
                    fs.writeFileSync('/tmp/yt_cookies.txt', process.env.YT_COOKIES);
                }
                audioBuffer = await new Promise((resolve) => {
                    const ap = youtubedl.exec(cleanUrl, ytArgs);
                    const chunks = [];
                    const timer = setTimeout(() => { try {
                        ap.kill();
                    }
                    catch { } ; resolve(null); }, 120_000);
                    ap.on('error', () => resolve(null));
                    ap.stderr?.on('data', (d) => console.log('[yt-dlp]', d.toString().trim()));
                    ap.stdout?.on('data', (d) => chunks.push(d));
                    ap.stdout?.on('end', () => { clearTimeout(timer); resolve(chunks.length > 0 ? Buffer.concat(chunks) : null); });
                    ap.on('close', (code) => { if (code !== 0 && chunks.length === 0)
                        resolve(null); });
                });
                if (audioBuffer)
                    console.log('[Import-ByID] yt-dlp success, size:', audioBuffer.length);
            }
            catch (e) {
                console.log('[Import-ByID] yt-dlp failed:', e?.message?.slice(0, 200));
            }
        }
        // Method E: Try fetching YouTube page through CORS proxy to get CDN URL
        if (!audioBuffer) {
            for (const proxyBase of ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?']) {
                if (audioBuffer)
                    break;
                try {
                    const proxyUrl = proxyBase + encodeURIComponent(cleanUrl);
                    const prRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
                    if (!prRes.ok)
                        continue;
                    const html = await prRes.text();
                    const marker = 'ytInitialPlayerResponse = ';
                    const idx = html.indexOf(marker);
                    if (idx === -1)
                        continue;
                    const start = idx + marker.length;
                    let depth = 0, end = start;
                    for (let i = start; i < html.length; i++) {
                        if (html[i] === '{')
                            depth++;
                        else if (html[i] === '}') {
                            depth--;
                            if (depth === 0) {
                                end = i + 1;
                                break;
                            }
                        }
                    }
                    if (end <= start)
                        continue;
                    const pr = JSON.parse(html.slice(start, end));
                    finalTitle = finalTitle || pr?.videoDetails?.title || '';
                    finalArtist = finalArtist || pr?.videoDetails?.author || '';
                    duration = parseInt(pr?.videoDetails?.lengthSeconds || '0');
                    if (!finalCoverUrl) {
                        const thumbs = pr?.videoDetails?.thumbnail?.thumbnails;
                        if (thumbs?.length)
                            finalCoverUrl = thumbs[thumbs.length - 1].url;
                    }
                    const formats = pr?.streamingData?.adaptiveFormats || [];
                    const audioFormats = formats.filter((f) => f.mimeType?.startsWith('audio/'));
                    if (!audioFormats.length)
                        continue;
                    audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                    const audioUrl = audioFormats[0].url;
                    if (!audioUrl?.startsWith('http'))
                        continue;
                    const dlRes = await fetch(audioUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://www.youtube.com/' },
                    });
                    if (dlRes.ok) {
                        const buf = Buffer.from(await dlRes.arrayBuffer());
                        if (buf.length > 10240) {
                            audioBuffer = buf;
                            console.log('[Import-ByID] proxy CDN success, size:', buf.length);
                        }
                    }
                }
                catch (e) {
                    console.log('[Import-ByID] proxy failed:', e?.message?.slice(0, 80));
                }
            }
        }
        if (!audioBuffer)
            return res.status(400).json({ error: 'Ses indirilemedi (tüm yöntemler başarısız)' });
        // Upload to Supabase
        const audioPath = `${userId}/${Date.now()}_import.mp3`;
        const { error: uploadErr } = await supabase.storage
            .from('songs')
            .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
        if (uploadErr)
            return res.status(500).json({ error: `Yükleme hatası: ${uploadErr.message}` });
        const { data: { publicUrl: audioUrlFinal } } = supabase.storage.from('songs').getPublicUrl(audioPath);
        // Cover
        if (finalCoverUrl && finalCoverUrl.startsWith('http')) {
            try {
                const coverRes = await fetch(finalCoverUrl);
                if (coverRes.ok) {
                    const coverBlob = await coverRes.blob();
                    const coverPath = `${userId}/covers/${Date.now()}.jpg`;
                    const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, coverBlob, { contentType: 'image/jpeg', upsert: true });
                    if (!coverErr) {
                        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);
                        finalCoverUrl = publicUrl;
                    }
                }
            }
            catch { }
        }
        const { data, error: dbError } = await supabase.from('songs').insert([{
                user_id: userId,
                title: finalTitle || 'Bilinmeyen Şarkı',
                artist: finalArtist || 'Bilinmeyen Sanatçı',
                duration,
                audio_url: audioUrlFinal,
                cover_url: finalCoverUrl || null,
            }]).select().single();
        if (dbError)
            return res.status(500).json({ error: `Veritabanı hatası: ${dbError.message}` });
        res.json({ success: true, song: data });
    }
    catch (e) {
        console.error('Import-by-id error:', e);
        res.status(500).json({ error: e.message || 'Import başarısız' });
    }
});
// Get audio CDN URL via invidious (server-side to bypass CORS), client downloads & uploads to Supabase
app.get('/api/get-audio-url', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    try {
        const { videoId } = req.query;
        if (!videoId || typeof videoId !== 'string' || videoId.length !== 11)
            return res.status(400).json({ error: 'Geçersiz video ID' });
        const INV_INSTANCES = ['https://inv.nadeko.net', 'https://yewtu.be', 'https://invidious.snopyta.org'];
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Try invidious API for format URLs
        for (const instance of INV_INSTANCES) {
            try {
                const apiRes = await fetch(`${instance}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(10000) });
                if (!apiRes.ok)
                    continue;
                const data = await apiRes.json();
                const formats = data?.adaptiveFormats || [];
                const audioFormats = formats.filter((f) => f.type?.startsWith('audio/mp4') || f.type?.startsWith('audio/webm') || f.type?.startsWith('audio/opus'));
                if (audioFormats.length > 0) {
                    audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                    const best = audioFormats[0];
                    let title = data.title || '';
                    let artist = data.author || '';
                    if (title.includes(' - ')) {
                        const parts = title.split(' - ');
                        title = parts.slice(1).join(' - ').trim();
                        artist = parts[0].trim();
                    }
                    const thumbs = data?.thumbnailUrl || (data?.videoThumbnails?.length ? data.videoThumbnails[data.videoThumbnails.length - 1]?.url : '');
                    return res.json({
                        audioUrl: best.url,
                        title,
                        artist,
                        coverUrl: thumbs || '',
                        duration: data.lengthSeconds || 0,
                    });
                }
            }
            catch { }
        }
        // Fallback: try YouTube page through CORS proxy
        for (const proxyBase of ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?']) {
            try {
                const proxyUrl = proxyBase + encodeURIComponent(cleanUrl);
                const prRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
                if (!prRes.ok)
                    continue;
                const html = await prRes.text();
                const marker = 'ytInitialPlayerResponse = ';
                const idx = html.indexOf(marker);
                if (idx === -1)
                    continue;
                const start = idx + marker.length;
                let depth = 0, end = start;
                for (let i = start; i < html.length; i++) {
                    if (html[i] === '{')
                        depth++;
                    else if (html[i] === '}') {
                        depth--;
                        if (depth === 0) {
                            end = i + 1;
                            break;
                        }
                    }
                }
                if (end <= start)
                    continue;
                const pr = JSON.parse(html.slice(start, end));
                const formats = pr?.streamingData?.adaptiveFormats || [];
                const af = formats.filter((f) => f.mimeType?.startsWith('audio/'));
                if (af.length > 0) {
                    af.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                    let title = pr?.videoDetails?.title || '';
                    let artist = pr?.videoDetails?.author || '';
                    if (title.includes(' - ')) {
                        const parts = title.split(' - ');
                        title = parts.slice(1).join(' - ').trim();
                        artist = parts[0].trim();
                    }
                    const thumbs = pr?.videoDetails?.thumbnail?.thumbnails;
                    const coverUrl = thumbs?.length ? thumbs[thumbs.length - 1].url : '';
                    return res.json({
                        audioUrl: af[0].url,
                        title,
                        artist,
                        coverUrl,
                        duration: parseInt(pr?.videoDetails?.lengthSeconds || '0'),
                    });
                }
            }
            catch { }
        }
        res.status(400).json({ error: 'Ses URLi alınamadı' });
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Hata' });
    }
});
setupSocketHandlers(io);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Sesli server running on port ${PORT}`);
});
