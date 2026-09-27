/// <reference types="vite/client" />
import { ipcMain } from 'electron'

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID || '1337133713371337'

let rpc: any = null
let rpcReady = false
let rpcReconnectTimer: ReturnType<typeof setTimeout> | null = null
let rpcRetryTimer: ReturnType<typeof setTimeout> | null = null
let rpcStartTime: number | null = null
let lastPresence: { title?: string; artist?: string; isPlaying?: boolean } | null = null

if (!process.env.VITE_DISCORD_CLIENT_ID && !import.meta.env.VITE_DISCORD_CLIENT_ID) {
  console.warn('[RPC] VITE_DISCORD_CLIENT_ID yok — Discord uygulamasi kayitli degilse presence calismaz.')
}

export async function initDiscordRPC(retries = 3) {
  console.log('[RPC] initDiscordRPC called, CLIENT_ID:', CLIENT_ID)
  for (let i = 0; i < retries; i++) {
    try {
      rpcReady = false
      const { Client } = await import('@xhayper/discord-rpc')
      console.log('[RPC] Module loaded, creating client...')
      const client = new Client({ clientId: CLIENT_ID })
      client.on('ready', () => {
        console.log('[RPC] READY event received, user:', client.user?.username)
        rpc = client
        rpcReady = true
        if (rpcReconnectTimer) { clearTimeout(rpcReconnectTimer); rpcReconnectTimer = null }
        if (rpcRetryTimer) { clearTimeout(rpcRetryTimer); rpcRetryTimer = null }
        // Baglanti kurulunca son bilinen durumu bas (bossa idle)
        updateDiscordPresence(lastPresence, false)
      })
      client.on('disconnected', () => {
        console.log('[RPC] DISCONNECTED')
        rpcReady = false
        rpc = null
        rpcReconnectTimer = setTimeout(() => initDiscordRPC(3), 10000)
      })
      console.log('[RPC] Calling login()...')
      await client.login()
      console.log('[RPC] login() resolved successfully')
      return
    } catch (e) {
      console.log('[RPC] login() failed:', e)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
  console.log('[RPC] All retries exhausted — 30sn sonra tekrar denenecek (Discord acik degilse)')
  if (!rpcRetryTimer) {
    rpcRetryTimer = setTimeout(() => {
      rpcRetryTimer = null
      if (!rpcReady) initDiscordRPC(3)
    }, 30000)
  }
}

export function updateDiscordPresence(data: { title?: string; artist?: string; coverUrl?: string; isPlaying?: boolean; currentTime?: number; duration?: number } | null, isPlayingFallback?: boolean) {
  if (data) {
    lastPresence = { title: data.title, artist: data.artist, isPlaying: data.isPlaying ?? isPlayingFallback ?? false }
  }
  const song = data?.title && data?.artist ? { title: data.title, artist: data.artist } : null
  const playState = data?.isPlaying ?? isPlayingFallback ?? false
  const coverUrl = data?.coverUrl || ''
  if (!rpc || !rpcReady) { console.log('[RPC] skip update - not ready'); return }
  try {
    const details = song ? song.title : 'Waveify'
    const state = song ? (playState ? song.artist : `${song.artist} (Duraklatıldı)`) : 'Müzik seç'
    const largeText = song ? `${song.title} - ${song.artist}` : 'Waveify'
    if (playState && song) {
      rpcStartTime = rpcStartTime || Date.now()
    } else {
      rpcStartTime = null
    }
    rpc.user?.setActivity({
      details,
      state,
      // Discord sadece kayitli asset anahtarlarini kabul eder (ham URL calismaz)
      largeImageKey: 'waveify_logo',
      largeImageText: largeText,
      smallImageKey: playState ? 'play' : 'pause',
      smallImageText: playState ? 'Playing' : 'Paused',
      startTimestamp: playState && song ? (rpcStartTime || Date.now()) : undefined,
      instance: false,
    })
    void coverUrl
  } catch (e) { console.log('[RPC] setActivity error:', e) }
}

export function cleanupDiscord() {
  if (rpcReconnectTimer) { clearTimeout(rpcReconnectTimer); rpcReconnectTimer = null }
  if (rpcRetryTimer) { clearTimeout(rpcRetryTimer); rpcRetryTimer = null }
  if (rpc) { try { rpc.destroy() } catch {} rpc = null }
  rpcReady = false
}

export function setupDiscord() {
  ipcMain.on('discord:update', (_e, data: { title?: string; artist?: string; coverUrl?: string; isPlaying?: boolean; currentTime?: number; duration?: number }) => {
    updateDiscordPresence(data)
  })
}
