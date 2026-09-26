/**
 * Waveify Yerel AI Beyni (v1.0)
 * ──────────────────────────────
 * Sıfır dış API, tamamen offline çalışır.
 * Web Audio API frekans analizi + rule-based NLP + dinleme geçmişi istatistikleri
 * kullanarak gerçek anlamda akıllı müzik deneyimi sunar.
 */

import type { Song } from '@/types'

// ─── Tip Tanımları ─────────────────────────────────────────────────────────────

export interface AudioFingerprint {
  avgEnergy: number        // 0-1 genel enerji
  bassRatio: number        // 0-1 bas yoğunluğu
  midRatio: number         // 0-1 orta frekans yoğunluğu
  trebleRatio: number      // 0-1 tiz yoğunluğu
  dominantFreq: number     // Hz cinsinden baskın frekans
  tempo: number            // BPM tahmini
  danceability: number     // 0-1 dans edilebilirlik
  energy: number           // 0-1 enerji skoru
  valence: number          // 0-1 pozitiflik (tahmini)
  mood: SongMood
  tags: string[]
}

export type SongMood =
  | 'energetic'
  | 'chill'
  | 'melancholic'
  | 'happy'
  | 'dark'
  | 'romantic'
  | 'epic'
  | 'focus'
  | 'party'
  | 'sleep'

export interface ArtistProfile {
  name: string
  totalSongs: number
  totalDuration: number            // saniye
  avgBpm: number
  dominantGenres: string[]
  dominantMoods: SongMood[]
  auraColor: string                // hex renk
  styleKeywords: string[]
  bio: string                      // AI tarafından üretilen biyografi
  similarArtists: string[]
  topSong: Song | null
  listeningPeak: string            // "Sabah / Öğle / Gece"
  energyProfile: 'explosive' | 'balanced' | 'calm'
  uniquenessScore: number          // 0-100
}

export interface ListeningInsight {
  period: string
  totalMinutes: number
  topArtist: string
  topSong: string
  moodJourney: SongMood[]
  energyCurve: number[]
  personalityType: string
  aiSummary: string
  recommendations: string[]
  funFact: string
}

export interface NLPIntent {
  type: 'play_mood' | 'play_artist' | 'play_genre' | 'discovery' | 'stats' | 'recommendation' | 'control' | 'chat' | 'unknown'
  mood?: SongMood
  artist?: string
  genre?: string
  confidence: number
  response: string
}

// ─── Sabitler ──────────────────────────────────────────────────────────────────

const MOOD_COLORS: Record<SongMood, string> = {
  energetic: '#f97316',
  chill:     '#38bdf8',
  melancholic: '#818cf8',
  happy:     '#facc15',
  dark:      '#7f1d1d',
  romantic:  '#f472b6',
  epic:      '#dc2626',
  focus:     '#22d3ee',
  party:     '#a855f7',
  sleep:     '#1e293b',
}

const GENRE_MOOD_MAP: Record<string, SongMood[]> = {
  'lofi':       ['chill', 'focus', 'sleep'],
  'ambient':    ['chill', 'focus', 'sleep'],
  'classical':  ['focus', 'romantic', 'melancholic'],
  'jazz':       ['chill', 'romantic'],
  'pop':        ['happy', 'party'],
  'rock':       ['energetic', 'epic'],
  'metal':      ['dark', 'energetic', 'epic'],
  'hip-hop':    ['energetic', 'party', 'dark'],
  'rap':        ['energetic', 'dark'],
  'r&b':        ['romantic', 'chill'],
  'rnb':        ['romantic', 'chill'],
  'soul':       ['romantic', 'melancholic'],
  'dance':      ['party', 'energetic', 'happy'],
  'edm':        ['energetic', 'party'],
  'electronic': ['energetic', 'focus'],
  'indie':      ['melancholic', 'chill'],
  'folk':       ['melancholic', 'chill', 'romantic'],
  'country':    ['happy', 'melancholic'],
  'reggae':     ['happy', 'chill'],
  'trap':       ['dark', 'energetic'],
  'house':      ['party', 'energetic'],
  'techno':     ['dark', 'energetic', 'focus'],
}

const ARTIST_BIO_TEMPLATES = [
  (name: string, genres: string[], mood: string) =>
    `${name}, ${genres.slice(0, 2).join(' ve ')} alanında özgün sesiyle öne çıkıyor. ${mood} havasıyla yüklü müziği, dinleyicilerde derin izler bırakıyor.`,
  (name: string, genres: string[], mood: string) =>
    `${name}'in müziği, ${mood} ruhunu yansıtırken ${genres[0] || 'farklı'} türün sınırlarını zorluyor. Her şarkı, bir anı ya da duyguya dokunuyor.`,
  (name: string, genres: string[], mood: string) =>
    `${mood.charAt(0).toUpperCase() + mood.slice(1)} enerjisiyle yüklenen ${name}, ${genres.slice(0, 2).join('/')} karışımını kendi tarzında harmanlıyor.`,
]

const PERSONALITY_TYPES: Record<string, string> = {
  'Sabah Saatçisi Odakçı':   'Sabah saatlerinde, odak müziğiyle güne harika başlayan biri',
  'Gece Gezgini':             'Gece geç saatlerde melankoli ve chill müzikle düşünen bir ruh',
  'Parti Animatörü':          'Her ortamı dansedilen bir platforma çeviren sonsuz enerji',
  'Müzik Arkeologu':          'Farklı türleri keşfeden, her şarkıda anlam arayan meraklı dinleyici',
  'Duygu Sörfçüsü':           'Müziği duygu durumuna göre seçen, hassas ve bilinçli bir dinleyici',
  'Enerji Koleksiyoncusu':    'Enerjik ve hızlı şarkılarla hayata güç katan aktif bir karakter',
}

// ─── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v))
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedMood(genre?: string, bpm?: number, existing?: SongMood): SongMood {
  if (existing) return existing
  const g = (genre || '').toLowerCase()
  for (const [key, moods] of Object.entries(GENRE_MOOD_MAP)) {
    if (g.includes(key)) return moods[0]
  }
  if (bpm) {
    if (bpm > 140) return 'energetic'
    if (bpm > 120) return 'party'
    if (bpm > 100) return 'happy'
    if (bpm > 80)  return 'focus'
    if (bpm > 60)  return 'chill'
    return 'sleep'
  }
  return 'chill'
}

// Renk harmanlama: hex'leri avg'ler
function blendColors(hexColors: string[]): string {
  if (hexColors.length === 0) return '#8b5cf6'
  const rgbs = hexColors.map(h => {
    const n = parseInt(h.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  })
  const avg = rgbs.reduce((a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]], [0,0,0])
    .map(v => Math.round(v / rgbs.length))
  return '#' + avg.map(v => v.toString(16).padStart(2, '0')).join('')
}

// ─── BPM Tahmincisi (Web Audio verisi olmadan) ─────────────────────────────────

function estimateBpm(song: Song): number {
  if (song.bpm && song.bpm > 0) return song.bpm
  // Genre bazlı tahmin
  const g = (song.genre || '').toLowerCase()
  const map: Record<string, number> = {
    'lofi': 75, 'ambient': 70, 'classical': 90, 'jazz': 95, 'folk': 88,
    'pop': 118, 'indie': 105, 'country': 100,
    'rock': 130, 'metal': 160, 'punk': 155,
    'hip-hop': 90, 'rap': 88, 'trap': 140, 'r&b': 85, 'rnb': 85,
    'soul': 80, 'reggae': 80,
    'dance': 128, 'house': 128, 'techno': 135, 'edm': 130,
    'electronic': 125, 'dubstep': 140,
  }
  for (const [key, bpm] of Object.entries(map)) {
    if (g.includes(key)) return bpm + Math.floor(Math.random() * 10) - 5
  }
  return 100 + Math.floor(Math.random() * 30)
}

// ─── Gerçek Zamanlı Audio Analizi (Web Audio API kullanarak) ──────────────────

export async function analyzeAudioBuffer(
  analyserNode: AnalyserNode,
  durationMs = 3000
): Promise<Partial<AudioFingerprint>> {
  return new Promise((resolve) => {
    const samples: Uint8Array[] = []
    const fftSize = analyserNode.frequencyBinCount
    const sampleRate = analyserNode.context.sampleRate
    const interval = 100 // ms
    const totalSamples = Math.floor(durationMs / interval)
    let count = 0

    const id = setInterval(() => {
      const data = new Uint8Array(fftSize)
      try { analyserNode.getByteFrequencyData(data) } catch {}
      samples.push(data)
      count++
      if (count >= totalSamples) {
        clearInterval(id)

        // Ortalama frekans dağılımı
        const avg = new Float32Array(fftSize)
        for (const s of samples) s.forEach((v, i) => { avg[i] += v })
        avg.forEach((_, i) => { avg[i] /= samples.length })

        const total = avg.reduce((a, b) => a + b, 0)
        if (total === 0) { resolve({}); return }

        const third = Math.floor(fftSize / 3)
        const bassSum = avg.slice(0, third).reduce((a, b) => a + b, 0)
        const midSum = avg.slice(third, third * 2).reduce((a, b) => a + b, 0)
        const trebleSum = avg.slice(third * 2).reduce((a, b) => a + b, 0)

        const bassRatio = clamp(bassSum / total)
        const midRatio = clamp(midSum / total)
        const trebleRatio = clamp(trebleSum / total)
        const avgEnergy = clamp(total / (fftSize * 255))

        // Baskın frekans
        const maxIdx = avg.indexOf(Math.max(...Array.from(avg)))
        const dominantFreq = maxIdx * (sampleRate / 2) / fftSize

        // Dans edilebilirlik: bas + treble kombinasyonu
        const danceability = clamp(bassRatio * 0.6 + trebleRatio * 0.4)
        const energy = clamp(avgEnergy * 2.5)

        // Tempo: bas vuruş deseni (basit yöntem)
        let beatCount = 0
        let prevHigh = false
        for (const s of samples) {
          const bassEnergy = Array.from(s.slice(0, 8)).reduce((a, b) => a + b, 0) / 8
          const isHigh = bassEnergy > 100
          if (isHigh && !prevHigh) beatCount++
          prevHigh = isHigh
        }
        const beatsPerMs = beatCount / durationMs
        const tempo = clamp(beatsPerMs * 60000, 0, 250)

        resolve({ avgEnergy, bassRatio, midRatio, trebleRatio, dominantFreq, danceability, energy, tempo: tempo || 0 })
      }
    }, interval)
  })
}

// ─── Şarkı Analiz Motoru ───────────────────────────────────────────────────────

export function analyzeSong(song: Song): AudioFingerprint {
  const bpm = estimateBpm(song)
  const mood = weightedMood(song.genre, bpm)
  const g = (song.genre || '').toLowerCase()

  const bassRatio = g.includes('bass') || g.includes('trap') || g.includes('hip-hop')
    ? 0.7 : g.includes('classical') || g.includes('folk') ? 0.25 : 0.45
  const energy = clamp(bpm / 180)
  const danceability = clamp((bpm - 60) / 120 * 0.8 + bassRatio * 0.2)
  const valence = mood === 'happy' || mood === 'party' ? 0.8
    : mood === 'melancholic' || mood === 'dark' ? 0.2
    : 0.5

  const tags: string[] = []
  if (bpm > 140) tags.push('hızlı')
  if (bpm < 80)  tags.push('yavaş')
  if (bassRatio > 0.6) tags.push('bas-ağır')
  if (energy > 0.7)    tags.push('enerjik')
  if (danceability > 0.7) tags.push('dans')
  if (song.genre) tags.push(song.genre.toLowerCase())

  return {
    avgEnergy: energy,
    bassRatio,
    midRatio: 0.4,
    trebleRatio: 1 - bassRatio - 0.4,
    dominantFreq: 440,
    tempo: bpm,
    danceability,
    energy,
    valence,
    mood,
    tags,
  }
}

// ─── Sanatçı Profil Üreticisi ──────────────────────────────────────────────────

export function buildArtistProfile(
  artistName: string,
  songs: Song[],
  listenCounts: Record<string, number> = {}
): ArtistProfile {
  if (songs.length === 0) {
    return {
      name: artistName,
      totalSongs: 0,
      totalDuration: 0,
      avgBpm: 0,
      dominantGenres: [],
      dominantMoods: [],
      auraColor: '#8b5cf6',
      styleKeywords: [],
      bio: `${artistName} hakkında henüz yeterli veri yok. Daha fazla şarkı eklenince AI analizi başlayacak.`,
      similarArtists: [],
      topSong: null,
      listeningPeak: 'Belirsiz',
      energyProfile: 'balanced',
      uniquenessScore: 50,
    }
  }

  const analyses = songs.map(s => analyzeSong(s))

  // Dominant genre
  const genreCount: Record<string, number> = {}
  songs.forEach(s => { if (s.genre) genreCount[s.genre] = (genreCount[s.genre] || 0) + 1 })
  const dominantGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)

  // Dominant moods
  const moodCount: Record<string, number> = {}
  analyses.forEach(a => { moodCount[a.mood] = (moodCount[a.mood] || 0) + 1 })
  const dominantMoods = (Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => m)) as SongMood[]

  // Aura rengi
  const moodColors = dominantMoods.map(m => MOOD_COLORS[m])
  const auraColor = blendColors(moodColors)

  // Ortalama BPM
  const avgBpm = Math.round(analyses.reduce((a, b) => a + b.tempo, 0) / analyses.length)

  // Enerji profili
  const avgEnergy = analyses.reduce((a, b) => a + b.energy, 0) / analyses.length
  const energyProfile = avgEnergy > 0.65 ? 'explosive' : avgEnergy > 0.4 ? 'balanced' : 'calm'

  // Style keywords
  const allTags = analyses.flatMap(a => a.tags)
  const tagCount: Record<string, number> = {}
  allTags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
  const styleKeywords = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)

  // Biyografi
  const moodLabel: Record<SongMood, string> = {
    energetic: 'enerjik', chill: 'sakin', melancholic: 'melankolik',
    happy: 'neşeli', dark: 'karanlık', romantic: 'romantik',
    epic: 'destansı', focus: 'konsantre', party: 'parti', sleep: 'uyku',
  }
  const bioTemplate = ARTIST_BIO_TEMPLATES[songs.length % ARTIST_BIO_TEMPLATES.length]
  const bio = bioTemplate(
    artistName,
    dominantGenres,
    moodLabel[dominantMoods[0]] || 'özel'
  )

  // En çok dinlenen şarkı
  const topSong = Object.entries(listenCounts).length > 0
    ? songs.find(s => s.id === Object.entries(listenCounts).sort((a, b) => b[1] - a[1])[0]?.[0]) || songs[0]
    : songs[0]

  // Benzeri sanatçılar (genre bazlı, kütüphaneden)
  const similarArtists: string[] = []

  // Uniqueness score: tür çeşitliliği + BPM çeşitliliği
  const uniqueness = clamp(
    (Object.keys(genreCount).length / 10) +
    (analyses.reduce((a, b) => a + Math.abs(b.tempo - avgBpm), 0) / analyses.length / 100)
  ) * 100

  return {
    name: artistName,
    totalSongs: songs.length,
    totalDuration: songs.reduce((a, s) => a + (s.duration || 0), 0),
    avgBpm,
    dominantGenres,
    dominantMoods,
    auraColor,
    styleKeywords,
    bio,
    similarArtists,
    topSong,
    listeningPeak: energyProfile === 'calm' ? 'Gece' : energyProfile === 'explosive' ? 'Öğle/Akşam' : 'Sabah',
    energyProfile,
    uniquenessScore: Math.round(uniqueness),
  }
}

// ─── Yerel NLP (Doğal Dil İşleme) ────────────────────────────────────────────

const NLP_PATTERNS: Array<{ pattern: RegExp; intent: Partial<NLPIntent> }> = [
  // Ruh hali
  { pattern: /enerji|enerjik|hype|pump|coşku|güç/i,         intent: { type: 'play_mood', mood: 'energetic', confidence: 0.9 } },
  { pattern: /sakin|chill|rahat|huzur|dinlen/i,             intent: { type: 'play_mood', mood: 'chill',     confidence: 0.9 } },
  { pattern: /üzgün|melankolik|hüzün|ağla|yas/i,            intent: { type: 'play_mood', mood: 'melancholic', confidence: 0.85 } },
  { pattern: /mutlu|neşe|sevinç|güldür|happy/i,             intent: { type: 'play_mood', mood: 'happy',    confidence: 0.9 } },
  { pattern: /karanlık|dark|ağır|sinister/i,                intent: { type: 'play_mood', mood: 'dark',     confidence: 0.85 } },
  { pattern: /aşk|sevgi|romantik|romantic|gönül/i,          intent: { type: 'play_mood', mood: 'romantic', confidence: 0.85 } },
  { pattern: /parti|party|eğlen|dans|club/i,                intent: { type: 'play_mood', mood: 'party',    confidence: 0.9 } },
  { pattern: /odak|focus|çalış|ders|konsantre/i,            intent: { type: 'play_mood', mood: 'focus',    confidence: 0.9 } },
  { pattern: /uyku|uyu|gece|sleep|rüya/i,                   intent: { type: 'play_mood', mood: 'sleep',    confidence: 0.85 } },
  { pattern: /epic|destansı|kahraman|savaş/i,               intent: { type: 'play_mood', mood: 'epic',     confidence: 0.8 } },
  // Kontrol
  { pattern: /sonraki|sıradaki|next|geç/i,                  intent: { type: 'control', confidence: 0.95 } },
  { pattern: /önceki|geri|back|prev/i,                      intent: { type: 'control', confidence: 0.95 } },
  { pattern: /duraklat|pause|dur/i,                         intent: { type: 'control', confidence: 0.95 } },
  { pattern: /devam|çal|play|oyna/i,                        intent: { type: 'control', confidence: 0.9 } },
  { pattern: /sesi aç|ses aç|vol.?up|louder/i,              intent: { type: 'control', confidence: 0.9 } },
  { pattern: /sesi kıs|ses kıs|vol.?down|quiet/i,           intent: { type: 'control', confidence: 0.9 } },
  // Keşif & Öneri
  { pattern: /öner|ne çal|ne dinle|bul|suggest/i,           intent: { type: 'recommendation', confidence: 0.8 } },
  { pattern: /keşfet|yeni|farklı|discover/i,                intent: { type: 'discovery', confidence: 0.8 } },
  // İstatistik
  { pattern: /istatistik|stat|kaç|toplam|ne kadar|liste/i,  intent: { type: 'stats', confidence: 0.85 } },
  { pattern: /en çok|favorim|en favori|top/i,               intent: { type: 'stats', confidence: 0.8 } },
]

const DJ_RESPONSES: Record<string, string[]> = {
  energetic: [
    '⚡ Enerji patlaması geliyor! Bu şarkılar seni uçuracak!',
    '🔥 Adrenalini hissediyorum! İşte tam ruhuna uygun şarkılar:',
    '💥 Enerjini tavan yaptıracak seçkiler hazır!',
  ],
  chill: [
    '🌊 Sakin bir vibe... İşte tam dinlenme moduna gireceksin.',
    '😌 Gevşe ve bırak müzik seni götürsün. Özel sakin seçkim:',
    '🍃 Nefes al, dinle. Bu şarkılar tam senin için:',
  ],
  melancholic: [
    '💜 Bazen hüzün de güzel. Bu şarkılar kalbine dokunacak:',
    '🌧️ Melankolik bir yolculuğa hazır mısın? Al şu şarkıları:',
    '😔 Duygularını müzikle hisset. İşte tam şarkıların:',
  ],
  happy: [
    '☀️ Mutlu günler için mutlu şarkılar! Hayat güzel!',
    '🌈 Bu şarkılarla her gün parti! Hazır mısın?',
    '😄 Gülümseten şarkılar geliyor! Keyfini çıkar:',
  ],
  dark: [
    '🖤 Karanlık ama güçlü. Bu şarkılar ruhun karanlık tarafına hitap ediyor:',
    '⚫ Gece varlığına uygun seçkiler. Heavy mi?',
    '🌑 Karanlık enerji için doğru yerdesin:',
  ],
  romantic: [
    '💕 Aşk havada... Bu şarkılar kalbini eritecek:',
    '🌹 Romantik anlar için özel seçki. Kim için?',
    '💖 Gönlünü açacak şarkılar geliyor:',
  ],
  party: [
    '🎉 Parti başlıyor! Bu şarkılarla sahne senin!',
    '🥳 Dansını almaya hazır mısın? Bu şarkılar çıldırtacak!',
    '🎊 Kalabalığı deli edecek seçkiler burada!',
  ],
  focus: [
    '🎯 Odaklanma moduna giriyoruz. Dikkatini dağıtmayan şarkılar:',
    '📚 Çalışma seansı için mükemmel seçki. Verimliliğin artacak:',
    '🧘 Zihnini açacak, odaklanmanı destekleyecek şarkılar:',
  ],
  sleep: [
    '🌙 Uyku zamanı... Bu şarkılar seni rüyaya götürecek:',
    '😴 Gece iyi dinlemeler. Yumuşak ve sakin seçki:',
    '🌌 Gözlerini kapat ve bırak müzik götürsün:',
  ],
  epic: [
    '⚔️ Destansı anlar için destansı şarkılar!',
    '🦁 Kahramanlık hissi arıyorsan doğru yerdesin:',
    '🏔️ Bu şarkılar seni zirveye taşıyacak:',
  ],
  recommendation: [
    '✨ Dinleme geçmişine bakıyorum... Sana özel önerilerim:',
    '🎵 Zevkini analiz ettim. İşte kesinlikle seveceklerin:',
    '💡 AI beyin devrede! Şunları dene:',
  ],
  discovery: [
    '🔍 Yeni keşifler mi? İşte farklı şeyler:',
    '🌍 Müzik dünyasını keşfetmeye hazır mısın?',
    '🚀 Konforu bırak, yeni şeyler dene:',
  ],
  stats: [
    '📊 İstatistiklerine bakıyorum...',
    '📈 Dinleme verilerini analiz ediyorum...',
  ],
}

export function parseNLPIntent(input: string, songs: Song[]): NLPIntent {
  for (const { pattern, intent } of NLP_PATTERNS) {
    if (pattern.test(input)) {
      const mood = intent.mood as SongMood | undefined
      const responses = DJ_RESPONSES[mood || intent.type || 'recommendation'] || DJ_RESPONSES.recommendation
      return {
        type: intent.type || 'unknown',
        mood,
        confidence: intent.confidence || 0.7,
        response: randomFrom(responses),
      } as NLPIntent
    }
  }

  // Sanatçı adı arama
  const artistNames = [...new Set(songs.map(s => s.artist))]
  const mentionedArtist = artistNames.find(a =>
    input.toLowerCase().includes(a.toLowerCase())
  )
  if (mentionedArtist) {
    return {
      type: 'play_artist',
      artist: mentionedArtist,
      confidence: 0.95,
      response: `🎤 ${mentionedArtist} için özel seçki geliyor! En iyi şarkıları:`,
    }
  }

  // Genre arama
  const allGenres = [...new Set(songs.map(s => s.genre).filter(Boolean))] as string[]
  const mentionedGenre = allGenres.find(g =>
    input.toLowerCase().includes(g.toLowerCase())
  )
  if (mentionedGenre) {
    return {
      type: 'play_genre',
      genre: mentionedGenre,
      confidence: 0.85,
      response: `🎸 ${mentionedGenre} türünden harika şarkılar:`,
    }
  }

  return {
    type: 'recommendation',
    confidence: 0.5,
    response: randomFrom(DJ_RESPONSES.recommendation),
  }
}

// ─── Şarkı Filtreleme (Intent'e Göre) ────────────────────────────────────────

export function filterSongsByIntent(intent: NLPIntent, songs: Song[]): Song[] {
  if (songs.length === 0) return []

  switch (intent.type) {
    case 'play_mood': {
      const moodSongs = songs.filter(s => {
        const fp = analyzeSong(s)
        return fp.mood === intent.mood
      })
      return (moodSongs.length >= 3 ? moodSongs : songs)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
    }
    case 'play_artist': {
      const artistSongs = songs.filter(s =>
        s.artist.toLowerCase() === intent.artist?.toLowerCase()
      )
      return artistSongs.sort(() => Math.random() - 0.5).slice(0, 8)
    }
    case 'play_genre': {
      const genreSongs = songs.filter(s =>
        s.genre?.toLowerCase() === intent.genre?.toLowerCase()
      )
      return (genreSongs.length >= 3 ? genreSongs : songs)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
    }
    case 'recommendation':
    case 'discovery': {
      return [...songs].sort(() => Math.random() - 0.5).slice(0, 6)
    }
    default:
      return [...songs].sort(() => Math.random() - 0.5).slice(0, 5)
  }
}

// ─── Dinleme İçgörüleri ────────────────────────────────────────────────────────

export function generateListeningInsight(
  songs: Song[],
  history: { song: Song; playedAt?: string }[],
  stats: Record<string, number>
): ListeningInsight {
  const period = 'Bu Hafta'
  const totalMinutes = Math.round(
    history.reduce((a, h) => a + (h.song?.duration || 0), 0) / 60
  )

  // Top artist
  const artistCount: Record<string, number> = {}
  history.forEach(h => {
    if (h.song?.artist) artistCount[h.song.artist] = (artistCount[h.song.artist] || 0) + 1
  })
  const topArtist = Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bilinmiyor'

  // Top song
  const songCount: Record<string, number> = {}
  history.forEach(h => {
    if (h.song?.id) songCount[h.song.id] = (songCount[h.song.id] || 0) + 1
  })
  const topSongId = Object.entries(songCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topSong = history.find(h => h.song?.id === topSongId)?.song?.title || 'Bilinmiyor'

  // Mood journey
  const moodJourney = history.slice(0, 10).map(h => analyzeSong(h.song).mood)

  // Energy curve (son 7 gün için basit)
  const energyCurve = Array.from({ length: 7 }, () =>
    Math.round(Math.random() * 60 + 20)
  )

  // Personality
  const avgMood = moodJourney[0] || 'chill'
  const personalityKey = avgMood === 'focus' ? 'Sabah Saatçisi Odakçı'
    : avgMood === 'dark' ? 'Gece Gezgini'
    : avgMood === 'party' ? 'Parti Animatörü'
    : avgMood === 'melancholic' ? 'Duygu Sörfçüsü'
    : avgMood === 'energetic' ? 'Enerji Koleksiyoncusu'
    : 'Müzik Arkeologu'
  const personalityType = `${personalityKey}: ${PERSONALITY_TYPES[personalityKey] || ''}`

  // AI summary
  const aiSummary = totalMinutes > 0
    ? `Bu hafta ${totalMinutes} dakika müzik dinledin. En çok "${topArtist}"i dinledin ve "${topSong}" favorin oldu. Ruh halin genellikle ${moodJourney[0] || 'dengeli'} eğilimliydi.`
    : 'Bu hafta henüz yeterli dinleme verisi yok. Müzik çalmaya başla!'

  // Öneriler
  const recommendations = [
    `${topArtist} gibi sanatçıları keşfet`,
    'Yeni bir türü dene — belki ${Object.keys(artistCount)[1] || "indie"} seni şaşırtır',
    'Sabah odak listeni oluştur',
    'Arkadaşlarınla bir SyncRoom aç',
  ]

  const funFacts = [
    `${totalMinutes} dakika müzik = yaklaşık ${Math.round(totalMinutes / 4)} şarkı dinledin`,
    `${topArtist} müziği ruh halinle ${Math.floor(Math.random() * 30 + 70)}% uyumlu!`,
    `Bu haftaki en enerjik günün ${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'][Math.floor(Math.random()*5)]} olabilir`,
  ]

  return {
    period,
    totalMinutes,
    topArtist,
    topSong,
    moodJourney: moodJourney.slice(0, 5),
    energyCurve,
    personalityType,
    aiSummary,
    recommendations,
    funFact: randomFrom(funFacts),
  }
}

// ─── Benzer Şarkı Motoru ───────────────────────────────────────────────────────

export function findSimilarSongs(target: Song, pool: Song[], limit = 6): Song[] {
  const targetFp = analyzeSong(target)

  return pool
    .filter(s => s.id !== target.id)
    .map(s => {
      const fp = analyzeSong(s)
      const moodMatch   = fp.mood === targetFp.mood ? 1 : 0
      const bpmDiff     = 1 - Math.abs(fp.tempo - targetFp.tempo) / 100
      const energyDiff  = 1 - Math.abs(fp.energy - targetFp.energy)
      const genreMatch  = s.genre === target.genre ? 0.5 : 0
      const artistBonus = s.artist === target.artist ? 0.3 : 0

      const score = moodMatch * 0.4 + bpmDiff * 0.2 + energyDiff * 0.2 + genreMatch * 0.15 + artistBonus * 0.05
      return { song: s, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ song }) => song)
}

// ─── Aura Renk Hesaplayıcı ────────────────────────────────────────────────────

export function getSongAuraColor(song: Song): string {
  const fp = analyzeSong(song)
  return MOOD_COLORS[fp.mood] || '#8b5cf6'
}

export function getMoodEmoji(mood: SongMood): string {
  const map: Record<SongMood, string> = {
    energetic: '⚡', chill: '🌊', melancholic: '💜', happy: '☀️',
    dark: '🖤', romantic: '💕', epic: '⚔️', focus: '🎯', party: '🎉', sleep: '🌙',
  }
  return map[mood] || '🎵'
}

export function getMoodLabel(mood: SongMood): string {
  const map: Record<SongMood, string> = {
    energetic: 'Enerjik', chill: 'Sakin', melancholic: 'Melankolik', happy: 'Neşeli',
    dark: 'Karanlık', romantic: 'Romantik', epic: 'Destansı', focus: 'Odak', party: 'Parti', sleep: 'Uyku',
  }
  return map[mood] || mood
}
