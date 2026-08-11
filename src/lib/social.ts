export interface Persona {
  title: string
  emoji: string
  desc: string
  gradient: string
}

const GENRE_PERSONAS: [string[], Persona][] = [
  [['rock', 'metal', 'punk', 'grunge', 'hard'], { title: 'Rock Yıldızı', emoji: '🎸', desc: 'Sahnede enerji senin işin, gitar soloları ruhunun dili.', gradient: 'from-red-500 to-orange-500' }],
  [['pop', 'dans', 'disco', 'dans'], { title: 'Pop Parlayan', emoji: '✨', desc: 'Hit şarkılar seni bulur, her liste senin vitrinin.', gradient: 'from-pink-500 to-fuchsia-500' }],
  [['rap', 'hip', 'trap', 'grime'], { title: 'Ritim Ustası', emoji: '🎤', desc: 'Her beat kalbinde yankılanır, flow senin süper gücün.', gradient: 'from-amber-500 to-red-500' }],
  [['jazz', 'blues', 'soul', 'swing'], { title: 'Gece Kuşu', emoji: '🎷', desc: 'Saksafon sesi, kafe ışıkları... Zamansız bir ruhun var.', gradient: 'from-indigo-500 to-blue-500' }],
  [['klasik', 'orkestra', 'piano'], { title: 'Sahne Asili', emoji: '🎻', desc: 'Zarafet ve derinlik — müziğin klasik yüzü senin dünyan.', gradient: 'from-slate-500 to-gray-700' }],
  [['elektronik', 'techno', 'house', 'edm', 'synth'], { title: 'Gelecekçi', emoji: '🤖', desc: 'Sentezleyiciler ve ritim makineleri — yarının sesi sende.', gradient: 'from-cyan-500 to-blue-600' }],
  [['arabesk', 'sanat', 'türk'], { title: 'Duygusal Ruh', emoji: '🌙', desc: 'Kelimeler kalbine işler, hüzün bile güzel gelir sana.', gradient: 'from-purple-500 to-indigo-500' }],
  [['folk', 'halk', 'ozan', 'akustik'], { title: 'Anadolu Ruhu', emoji: '🪕', desc: 'Köklerine bağlı, hikâye anlatıcısı bir dinleyicisin.', gradient: 'from-green-500 to-emerald-600' }],
  [['ambient', 'deneysel', 'lo-fi', 'chill'], { title: 'Ses Dalgıcı', emoji: '🌊', desc: 'Ambient ve derinlik seni çağırır, sessizlik bile müzik.', gradient: 'from-teal-500 to-cyan-600' }],
]

const FALLBACK_PERSONA: Persona = { title: 'Ses Avcısı', emoji: '🎧', desc: 'Her türden parçaya açıksın — saf müzik tutkusu.', gradient: 'from-wave-500 to-fuchsia-500' }

export function personaFromGenres(genreCounts: Record<string, number>): Persona {
  const top = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]
  if (!top) return FALLBACK_PERSONA
  const g = top[0].toLowerCase()
  for (const [keys, persona] of GENRE_PERSONAS) {
    if (keys.some((k) => g.includes(k))) return persona
  }
  return FALLBACK_PERSONA
}

export function compatLabel(pct: number): { text: string; cls: string } {
  if (pct >= 80) return { text: '🎵 Ruh İkizleri', cls: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30' }
  if (pct >= 60) return { text: '🔥 Harika Eşleşme', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' }
  if (pct >= 40) return { text: '👍 İyi Uyum', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' }
  if (pct >= 20) return { text: '🤝 Farklı Zevkler', cls: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' }
  return { text: '🌵 Karşıt Kutuplar', cls: 'text-surface-300 bg-surface-800 border-surface-700' }
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const id of a) if (b.has(id)) inter++
  return inter / (a.size + b.size - inter)
}
