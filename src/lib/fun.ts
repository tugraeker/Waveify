export function dayIndex(): number {
  const now = new Date()
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000)
}

function seeded(i: number, n: number): number {
  const x = Math.sin(i * 9301 + n * 49297) * 233280
  return x - Math.floor(x)
}

export const FORTUNES = [
  '🎶 Bugün kulakların şanslı! Dinleyeceğin ilk şarkı sana ilham verecek.',
  '💿 Eskiden sevdiğin bir şarkı bugün yeniden karşına çıkacak. Dinle!',
  '🎸 Bir arkadaşın seninle aynı şarkıyı dinliyor. Uyum oranın tavan yapıyor.',
  '🔥 Bugün tempon yüksek — playlistine 2x hız ekleyin, günü yakala.',
  '🌙 Bu gece yatarken bir lo-fi parça rüyalarını süsleyecek.',
  '🎧 Yeni bir sanatçı keşfedeceksin. Ruh halin karışımına bir şans ver.',
  '👑 Bugün senin günün — En Çok Dinlenenler listesinde ilk sıradasın (en azından kalbinde).',
  '🎤 Cesur ol! Bugün kendi kendine söyleyeceğin şarkı günün hiti olacak.',
  '🎵 Başka birinin yüklediği bir şarkı bugün en çok dinlediğin parça olacak.',
  '💫 Kaset efektiyle bir şarkıyı dönüştür — nostalji sana iyi gelecek.',
]

export const FACTS = [
  'Beatles "Yesterday" şarkısını ilk günlerde "Scrambled Eggs" (Karışık Yumurta) adıyla kaydetmişti.',
  'Dünyanın en uzun şarkısı resmi olarak 13 saat 23 dakika sürer (Stream of Sleep).',
  'Ağaçlar da müzik dinleyebilir: bazı deneyler bitkilerin ritme tepki verdiğini gösteriyor.',
  'İnsan kulağı 20 Hz ile 20.000 Hz arasındaki sesleri duyar — kulak yaşın arttıkça daralır.',
  'Bir şarkının kulağa takılmasına "earworm" (kulak kurdu) denir ve bilimsel olarak incelenmiştir.',
  'Mozart 5 yaşında beste yapmaya başladı ve 600\'den fazla eser bıraktı.',
  'Vinil plaklar 45 rpm hızında çalınırken, ilk plaklar 78 rpm idi.',
  'Bir şarkının ortalama uzunluğu 3 dakikadır çünkü ilk plaklar bu süreyi taşıyabiliyordu.',
  'Kulaklıkla yüksek sesle müzik dinlemek işitme kaybının en yaygın sebebidir.',
  'Karaoke kelimesi Japonca "boş orkestra" anlamına gelir.',
  'Michael Jackson\'ın "Thriller" klibi müzik videosu çılgınlığını başlatmıştır.',
  'İnsan beyni tanıdık bir şarkıyı 0.1 saniyede tanıyabilir.',
  'Ritim duygusu sadece insanlara özgü değildir; papağanlar da ritme dans edebilir.',
  'Bir senfoni orkestrasında 100\'den fazla müzisyen olabilir.',
  'En yüksek sesle çalınan konser 136 desibele ulaşmıştı (jet motorundan yüksek!).',
]

export function dailyFortune(): string {
  const i = dayIndex()
  return FORTUNES[Math.floor(seeded(i, 1) * FORTUNES.length)]
}

export function dailyFact(): string {
  const i = dayIndex()
  return FACTS[Math.floor(seeded(i, 7) * FACTS.length)]
}

export interface WheelSegment { label: string; color: string }

export function wheelRotation(seed: number): number {
  return 360 * 6 + seeded(seed, 13) * 360
}
