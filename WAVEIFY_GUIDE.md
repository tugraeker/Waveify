# Waveify — AI Geliştirici Rehberi (v7.5.0)

> Bu doküman, Waveify projesinde çalışacak başka bir AI'ya/insana projeyi devretmek için hazırlandı.
> Her şeyi kapsar: mimari, tüm özellikler, veri şeması, build/yayın akışı ve bilinen durumlar.

---

## 1. Genel Bakış

**Waveify** — özel müzik paylaşım ve dinleme platformu. Kullanıcılar şarkı yükler, arkadaşlarıyla paylaşır, birlikte dinler ve oyunlar oynar.

- **Platformlar:** Windows (Electron portable), Android (Capacitor), Web (Vite + vercel)
- **Backend:** Supabase (Postgres + Auth + Storage + PostgREST) + küçük Node/Socket.IO sunucusu (`server/`)
- **Son sürüm:** v7.5.0 (bug-fix sürümü, 4 kritik hata düzeltildi)
- **UI dili:** Türkçe
- **Depo:** https://github.com/tugraeker/Waveify (branch: main)
- **Landing:** `website/index.html` → vercel (alias: `website-xi-self-26.vercel.app`)

---

## 2. Teknoloji & Mimari

| Katman | Teknoloji |
|---|---|
| UI | React 18 + TypeScript + TailwindCSS (glassmorphism/aurora tema) |
| State | Zustand (`src/store/store.ts`) — songs, playlists, queue, currentSong, user |
| Router | **HashRouter** (URL'ler `#/route` biçiminde! `BrowserRouter` DEĞİL) |
| Masaüstü | Electron 33 (vite-plugin-electron) — tray, deep link (`waveify://`), yt-dlp entegrasyonu |
| Mobil | Capacitor 8 (`android/` — Gradle) |
| Backend | Supabase: `kjyjjqxqsbmrravhcuoc.supabase.co` (anon key `src/lib/supabase.ts`'te env'den) |
| Realtime | Socket.IO (`server/`) — sync odaları, online durumu |
| Ses | Web Audio API (`src/lib/audioEngine.ts`) — özel grafik, mid/side işleme |
| Oyun içi içerik | `src/lib/party.ts`, `src/lib/achievements.ts`, `src/lib/troll.ts` |

**Dosya haritası (kısaltılmış):**
```
src/
  App.tsx            — kök: aurora temaları, auth guard, deep link, troll kutusu
  main.tsx           — HashRouter + fontlar
  store/store.ts     — Zustand store
  lib/audioEngine.ts — ses grafiği (efektler, karaoke, 8D)
  lib/offline.ts     — Cache API ile çevrimdışı ses önbelleği
  lib/achievements.ts— XP, seviye, görevler, rozetler
  lib/party.ts       — konfeti efekti
  lib/troll.ts       — troll uyarı sistemi (sendTroll, şablonlar)
  components/        — Player, Sidebar, Visualizer, SyncedLyrics, TrollScreen, ...
  pages/             — 30+ sayfa (aşağıda tam liste)
server/              — Socket.IO sunucusu (sync odaları, /api/online-users)
  src/db/            — migration.sql, migration_v10.sql, schema.ts (SQL dokümanları)
website/             — statik landing
android/             — Capacitor Android projesi
release/             — electron-builder çıktıları (EXE)
scripts/             — download-ytdlp.mjs, generate-latest-yml.mjs
```

---

## 3. Tüm Sayfalar ve Özellikleri

### Ana gezinme (Sidebar)
| Sayfa | Route | Özellikler |
|---|---|---|
| Ana Sayfa | `/` | Ruh hali karışımları (Odak/Enerji/Rahatlama/Parti/Gece/Spor), otomatik listeler (En Çok Dinlenenler, Bu Hafta Popüler, En Son Yüklenenler, Beğenilenler, Arkadaşlarının En Çok Dinledikleri), canlı dinleyici sayısı, hava durumu, **Günlük Gizem** (bulanık kapakla şarkı tahmini), canlı ısı sayacı (heat meter), enerji karışımı |
| Ara | `/search` | Şarkı/sanatçı arama, filtreler |
| Kitaplık | `/library` | Liste/mozaik görünüm, filtreler (metin/tür/sanatçı), sıralama, beğeniler, bağlam menüsü |
| Yükle | `/upload` | MP3 sürükle-bırak, kapak, süre otomatik, sanatçı etiketi (kullanıcı seçimi), XP kazanımı. **v7.5.0:** bozuk dosyada takılma yok + şarkı anında store'a eklenir |
| Arkadaşlar | `/friends` | Arkadaş listesi (çevrimiçi rozeti), arama (isim/e-posta), istek gönder/kabul/red, **v7.5.0:** Gönderilen İstekler (bekliyor ⏳ + iptal), arkadaşa troll uyarısı gönderme |
| Sohbet | `/chat` | Arkadaşlarla sohbet |

### İkincil gezinme
| Sayfa | Route | Özellikler |
|---|---|---|
| Keşfet | `/discover` | Keşif akışı |
| Sıradakiler | `/queue` | Kuyruk yönetimi, **Gizemli Sıra** (karıştır butonu: ne çıkarsa sürpriz), kuyruğu çalma listesi olarak kaydet |
| Şimdi Çalıyor | `/now-playing` | Tam oynatıcı: albüm kapakları, **senkronize sözler** (düzenlenebilir), efektler paneli, kapak stilleri, sahne modları (Konser dahil), eşitlenmiş ekran |
| Profilim | `/profile` | Kişisel profil, istatistikler, rozetler |
| Birlikte Dinle | `/sync-room` | Socket.IO ile oda kodu oluştur/katıl, herkes aynı anda senkron dinleme, canlı sıra |
| Ses Manzaraları | `/soundscapes` | Doğa sesleri (yağmur, ateş...), **sonsuz lo-fi ritim üreteci** (kick/hat/bas/vinil çıtırtısı) |
| Drop Modu | `/trivia` | 3 saniyelik kesitle şarkı tahmin oyunu — **3 mod:** Klasik, Yıllar (on yıl tahmini), **Zombi** (hızlanan kesit, zombi hızı). Seri arttıkça puan katlanır, XP kazanımı. **v7.5.0:** katalog yükleme hatası düzeltildi, kesit oynatma hataları görünür, timer gerçek oynatmayla senkron |
| Beat Maker | `/beatmaker` | Adım sıralayıcı: 16 adım, davul/bas/sample, tempo, oynatma |
| Perde Oyunu | `/pitch-game` | Nota duy-tahmin et oyunu |
| Geçmiş | `/history` | Dinleme geçmişi |
| İstatistik | `/stats` | Toplam süre, ay ısı haritası, dinleme sayıları |
| Rozetler | `/badges` | Rozet galerisi, başarımlar |
| Charts | `/charts` | Haftalık listeler, liderlik, **Yıl Makinesi** (yıla göre şarkı listesi) |
| İçe Aktar | `/import` | YouTube URL → yt-dlp ile indir → Supabase'e yükle (yalnız Electron'da) |
| Şarkı Detayı | `/song/:id` | Şarkı bilgisi, sanatçı, benzer şarkılar |
| Sanatçı | `/artist/:name` | Sanatçı sayfası, takip |
| Playlist | `/playlist` | Otomatik + özel listeler |
| Ayarlar | `/settings` | Aşağıda ayrıca |

### Ayarlar ve diğer
- **Ayarlar:** profil (ad, hakkımda), şifre, tema (koyu/açık), 7 renk teması + özel hex, arkaplan rengi, ileri/geri zıplama adımı (seek step), kapak tarzı (💿 Plak / 💽 CD / 📼 Kaset / 📷 Polaroid), **crossfade** süresi, **Yedekle/Geri Yükle** (JSON export/import), versiyon merkezi, istatistik sıfırlama, önbellek temizleme, profili sıfırlama, oturum yönetimi
- **Admin** (`/admin`, sadece admin): yönetim paneli
- **Podcast** (`/podcast`), **Radio** (`/radio`): şarkı radyosu (benzer şarkı akışı)
- **Auth** (`/auth`): e-posta/şifre girişi

---

## 4. Oynatma & Ses Motoru (audioEngine.ts)

Web Audio API üzerine kurulu özel grafik:

```
source (HTMLAudioElement)
  → eqFilters (9 bantlı EQ)
    → bassFilter (lowshelf, bas güçlendirme)
      → convolver (yankı/oda) → reverbWet (kuru)
      → delay (3D/spatial) → delayWet (kuru)
      → [VOKAL SAHNESİ — mid/side] splitter
          → midBus  (L+R)/2 → midGain
          → sideBus (L−R)/2 → sideGain
          → out (×2 seviye dengesi) → gainNode (ana ses)
        → panner (8D döner) → analyser (visualizer) → destination
```

**Kritik not (v7.5.0 fix):** bassFilter **doğrudan gainNode'a BAĞLANMAMALI** — bu, vokal (mid/side) sahnesini baypas eder ve karaoke/vokal izolasyonu işe yaramazdı. Baypas kaldırıldı; kuru yol her zaman mid/side sahnesinden geçer. Seviye dengesi `out.gain = 2` (mid/side çıkışı orijinalin yarısı olduğu için +6 dB).

**Efektler (Şimdi Çalıyor paneli):**
- Bas geliştirme (lowshelf)
- Yankı/Reverb (konvolver)
- 3D/Oda (delay + feedback)
- **Karaoke — Vokal Kaldır:** mid yok edilir (midGain→0), sadece side (enstrümantal) kalır
- **Vokal İzolasyon:** sadece mid (vokal) kalır, side susturulur
- **8D Ses:** panner sürekli döner (derece kontrolü)
- Oda sahnesi (konser vb.), efekt sıfırlama, EQ

**Diğer oynatma özellikleri:**
- Oynatma hızı (0.5x–2x), A-B döngü (iki işaret arasında tekrar), özel ileri/geri zıplama adımı, akıllı karıştırma, çapraz geçiş (crossfade), normalize, kuyruk, mini player (visualizer'lı pencere), enerji rengi değiştiren ilerleme çubuğu, şarkı beğenme/puanlama (5 yıldız)

---

## 5. Veritabanı (Supabase — CANLI DURUM)

> ⚠️ **Önemli:** Canlı DB şeması bazı dosyalardan farklı. Kodda `last_seen` ve `year` kolonlarına GÜVENİLMEZ — ikisi de tabloda YOK (PostgREST 400 döner).

**`users`** (canlı): id, username, email, avatar_url, created_at — (`last_seen` YOK)
**`songs`** (canlı): id, user_id, title, artist, duration, audio_url, cover_url, likes_count, created_at — (`year` YOK, `plays_count` değil)
- `server/src/db/migration.sql` ve `miration.sql` (typo'lu dosya!) eski dokümanlardır; `migration_v10.sql` view/get_recent fonksiyonu içerir
- **Sözler** `lyrics` alanında şarkıda; çalma listeleri `playlists` + `playlist_songs` (App.tsx restoreUser'da embed `songs(*)` ile)
- Storage bucket'ları: `songs` (audio), `covers` (kapaklar)
- `friends` tablosu: user_id, friend_id, status ('pending'/'accepted'), created_at

**Canlı veri durumu (2026-08-11):** songs tablosunda yalnızca **1 kayıtlı şarkı** var → Drop Modu için en az 4 şarkı gerekir (uygulama artık bunu kullanıcıya net mesajla söylüyor). Yeni şarkılar Yükle/İçe Aktar ile eklendikçe oyun açılır.

---

## 6. Oyunlaştırma, Sosyal ve Eğlence Sistemleri

- **XP & Seviye:** dinleme, yükleme, trivia, görevlerden XP; seviye atlama ekranı (Trophy)
- **Görevler:** günlük görevler ("Tam Dinleme Serisi" — şarkıyı sonuna kadar dinleme), quest sistemi
- **Rozetler:** rozet galerisi, başarımlar
- **Troll sistemi:** arkadaşına tam ekran sürpriz uyarısı gönder (korku/sevimli/uyarı/parti tonları; `lib/troll.ts` şablonları); gelen kutuları `users.display_settings.trollInbox` üzerinden çapraz cihaz
- **Discord RPC:** dinlediğin şarkıyı Discord durumunda göster
- **Medya oturumu:** sistem medya tuşları (play/pause/next)
- **Sürprizler:** konsol şifresi ("waveify" veya "konfeti" yaz → konfeti yağar), gizemli sıra, günlük gizem
- **Kısayollar:** `?` ile kısayol ekranı, Escape kapatır
- **Deep link:** `waveify://song/<uuid>` ve `waveify://playlist/<uuid>` (Electron + Capacitor appUrlOpen)

---

## 7. Build & Yayın Akışı (Windows PowerShell)

```powershell
# Geliştirme
npm run dev                 # Vite dev sunucusu

# Kontrol
npx tsc --noEmit            # tip hatası kontrolü

# EXE portable (v7.5.0 akışı — yayın öncesi):
# 1) package.json "version" + android/app/build.gradle versionName güncelle
#    (DİKKAT: PowerShell `Set-Content` BOM ekler → Gradle "android: invalid manifest"
#     hatası verir. BOM'suz yaz: [IO.File]::WriteAllText(..., (New-Object Text.UTF8Encoding($false))))
# 2) npm run dist:portable   → release\Waveify-<ver>-portable.exe
# 3) .\gradlew.bat assembleDebug --no-daemon   (android/ içinde) → app-debug.apk
# 4) gh release create v<ver> ... && gh release upload v<ver> "<exe>" "<apk>"
# 5) website/index.html linklerini yeni sürüme güncelle (github.com/.../download/v<ver>/...)
# 6) website/ içinde: npx vercel deploy --prod --yes
# 7) git add -A && git commit && git push origin main
```

- Socket sunucusu (`server/`): `npm run dev` benzeri; sync odaları ve `/api/online-users` uç noktası (default port 3001, env: VITE_SOCKET_URL/PORT)

---

## 8. Sürüm Geçmişi

| Sürüm | İçerik |
|---|---|
| v4 | Şarkı radyosu, ses efektleri (bas/yankı/3D), ortam temaları, karaoke dokunma-atla, haftalık listeler & liderlik, ruh hali karışımları, kuyruğu liste olarak kaydet, mobil jestler, görevler, yenilikler modalı |
| v5 | Oynatma hızı (0.5x–2x), ses manzaraları, çevrimdışı indirme, sanatçı takibi, arkadaş aktivite akışı, söz arama, çalma listesi paylaşımı (deep link), kapak kolajı, haptik, tepsi/medya tuşu düzeltmeleri |
| v6 | Yeni tasarım sistemi (mor-amber, Space Grotesk, ambient glow), karaoke (mid-side vokal kaldırma), Drop Modu, sonsuz lo-fi ritim üreteci, yıldız haritası visualizer, tam dinleme serisi görevi |
| v7 | Aurora yeniden tasarım, glassmorphism sahneleri, konser modu, kapak arşivi (plak/CD/kaset/polaroid), 8D ses, oda sahneleri, Beat Maker, Perde Oyunu, zombi trivia, gizemli sıra, şarkı serenadı, combo patlama, canlı ısı sayacı, günlük gizem, yıl makinesi charts, troll ekranı, akıllı karıştırma, A-B döngü, normalize, yedekleme/geri yükleme |
| **v7.5.0** | **Bug-fix sürümü:** (1) Arkadaşlar listesi `last_seen` şema hatası 400 → boş liste; düzeltildi + "Gönderilen İstekler" sekmesi. (2) Alt oynatma çubuğu sola kayıktı → sol/sağ `flex-1` denge ile gerçek ortalama. (3) Drop Modu çalışmıyordu → sorguda olmayan `year` kolonu PostgREST 400; çıkarıldı + snippet timer oynatma onayına bağlandı + tüm hatalar görünür. (4) Vokal kaldırma çalışmıyordu → bassFilter doğrudan gainNode'a bağlıydı (mid/side baypas); kaldırıldı, +6 dB denge eklendi. Ek: upload metadata takılması + anında store güncelleme |

---

## 9. Bilinen Durumlar ve Dikkat Edilecekler

1. **Router HashRouter'dır** — test ederken URL'ler `#/route` biçiminde olmalı (`/#/trivia` gibi). Hash'siz path her zaman Ana Sayfa'ya düşer.
2. **users.last_seen ve songs.year YOK** — kodda asla sorgulama (canlı kanıt: 400 hatası). Trivia'da `year` bilinçli çıkarıldı; yıllar modu şarkıların yılı olmadan "Belirsiz" gösterir.
3. **Canlı katalog 1 şarkı** — Drop Modu kullanılabilirliği şarkı eklenmesine bağlı; UI bunu artık söylüyor.
4. **BOM tuzağı:** Android build.gradle PowerShell ile yazılırken BOM oluşursa "invalid manifest" hatası alınır → BOM'suz UTF-8 yazın.
5. **WhatsNewModal** hâlâ 6.0.0 içerikli (`VERSION = '6.0.0'`) — yeni sürümlerde güncellenmedi; istenirse yeni özelliklerle doldurulabilir.
6. **Supabase anon key** `.env` içinde (VITE_SUPABASE_URL / VITE_SUPABASE_KEY); Electron main, key'i renderer'dan kullanır. Deep link, tray ve yt-dlp Electron main tarafında (`dist-electron/main.cjs` kaynağı: `electron/`).
7. **Playwright testi için** (headless QA): `src/lib/supabase.ts`'teki proje ref'iyle `sb-<ref>-auth-token` anahtarına sahte oturum yazılıp `/#/route` ile girilir; users/playlists sorguları anon'da 401 verir (sessiz) — zararsızdır.
8. GitHub release'leri otomatik güncelleme için `latest.yml` üretir (electron-updater); `app-update.yml` extraResources'ta paketlenir.
