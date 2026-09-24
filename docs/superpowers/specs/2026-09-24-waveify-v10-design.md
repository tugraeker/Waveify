# Waveify v10.0.0 — Modüler Rewrite Tasarım Dokümanı

Tarih: 2026-09-24
Branch: `v10-rewrite` (PR -> main, sonra tag `v10.0.0` + .exe release)
Karar: Yaklaşım A — Aynı stack, temiz mimari, tüm özellikler korunur.
Öncelik: Windows .exe (Electron portable + setup). Web ikinci, Android sonra.
Backend: Supabase sıfırdan, eski veri taşınmaz. yt-dlp YouTube import kalır.

## 1. Mevcut Durum Özeti (v9.0.0)

- Stack: React 18 + TS + Tailwind + Zustand + HashRouter, Vite 6, Electron 33, Capacitor 8, Supabase JS 2, Socket.IO client.
- `src/` 84 dosya: 59 `.tsx` + 30 `.ts`. En şişkin: `NowPlaying.tsx` 52KB, `Chat.tsx` 48KB, `UserProfile.tsx` 39KB, `Settings.tsx` 29KB, `Friends.tsx` 25KB, `Home.tsx` 23KB.
- 30 route tek `App.tsx` içinde, lazy yok.
- `lib/audioEngine.ts` 16KB: Web Audio grafiği (9-bant EQ -> bass -> convolver -> delay -> mid/side vokal sahnesi -> panner -> analyser). v7.5.0 fix: bassFilter mid/side bypass kaldırıldı, +6dB denge.
- Canlı DB sorunları (guide kanıtlı): `users.last_seen` YOK, `songs.year` YOK — sorgulayan kod PostgREST 400 veriyor. Trivia Years modu `year` olmadan "Belirsiz".
- Canlı katalog ~1 şarkı (2026-08-11) — Drop Modu min 4 şarkı ister.
- Electron `main.ts` 15KB monolit: tray, deep-link `waveify://`, yt-dlp, updater, discord-rpc hepsi iç içe.
- Build: `download-ytdlp.mjs` + `vite build` + `electron-builder` + `generate-latest-yml.mjs`. `bin/`, `app-update.yml` extraResources. Web zip `waveify-v9.0.0-web.zip` repo içinde (1.4MB).
- HashRouter zorunlu (Electron file:// uyumu). URL'ler `#/route`.

## 2. Hedefler / Başarı Kriterleri

1. `npm run build:exe` tek komutla temiz portable + setup üretir, ilk çift tıkta açılır.
2. `npx tsc --noEmit` sıfır hata, `vite build` sıfır warning (kritik).
3. 30 route hepsi Hash URL ile açılır, her birinde ErrorBoundary + boş-durum mesajı.
4. Supabase yeni projede `001_init.sql` uygulanınca hata yok, RLS açıkken auth'lu kullanıcı şarkı yükleyip dinleyebilir.
5. YouTube import Electron'da uçtan uca çalışır (ilerleme + hata görünür).
6. `WhatsNewModal` VERSION `10.0.0` gösterir.

Kapsam dışı (v10.0.0 sonrası): Android APK stabilizasyonu, Socket server'ın Supabase Realtime'a taşınması, Playwright e2e.

Not: Mevcut 30 route birebir korunur, yeni route eklenmez. Guide'da adı geçen gömülü oyun/araçlar (Drop/Trivia, BeatMaker, Perde Oyunu, Soundscapes vb.) ayrı route değilse ait oldukları sayfanın (Studio, Quests, VisualLab vb.) içinde component olarak korunur.

## 3. Mimari

```
src/
  app/            App.tsx (sadece provider + lazy route tablosu), main.tsx (HashRouter), errorBoundary.tsx
  core/           config.ts, supabaseClient.ts, auth/AuthProvider.tsx, ui/* (Button, Modal, Toast, Skeleton), logger.ts, shortcuts.ts
  features/
    player/       audioEngine.v2.ts, queueStore.ts, playerStore.ts, components/PlayerBar, EffectsPanel, LyricsPanel, StageView, Visualizer
    library/      hooks/useSongs, usePlaylists, pages/Home, Search, Library, Upload, Import, SongDetail, ArtistPage, Playlist, Queue, History
    social/       hooks/useFriends, useChat, pages/Friends, Chat, SyncRoom, UserProfile
    gamify/       xp.ts, achievements.ts, pages/Discover, Charts, BadgeGallery, Quests, Trivia(=Drop), + arcade lazy (VisualLab, LiveSessions, AIDJ)
    studio/       pages/Studio, soundscapes.ts, beatmaker/, Radio, Podcast
    settings/     pages/Settings, Admin, backupRestore.ts, systemStatus.ts
electron/
  app.ts, window.ts, tray.ts, deepLink.ts (waveify://song/:id, playlist/:id), updater.ts, ytdlp.ts, discord.ts, preload.ts
server/           ince tutulur: sync-room + /api/online-users (PORT, VITE_SERVER_URL). Değişiklik yok, sadece tip temizliği.
supabase/
  migrations/001_init.sql, seed.sql (opsiyonel demo), README (yeni proje kurulum adımları)
scripts/
  build-exe.mjs (tek giriş: ytdlp indir + vite + builder), download-ytdlp.mjs (retry+checksum), generate-latest-yml.mjs (aynen)
```

Kurallar:
- Sayfalar `supabase.from` çağırmaz. Sadece `features/*/hooks/*` çağırır.
- Her feature kendi `types.ts` + `index.ts` (public API) ile dışa açılır.
- Route'lar `React.lazy` + `Suspense` (Skeleton). Örn: `const NowPlaying = lazy(() => import('@/features/player/pages/NowPlaying'))`.
- Zustand store'lar bölünür: `playerStore`, `queueStore`, `userStore`, `uiStore` (trollInbox dahil). Tek 217 satırlık dev store yok.
- `audioEngine.v2` aynı grafik, ama modüler: `createGraph(ctx)`, `setVocalMode('karaoke'|'isolate'|'off')`, `setSpatial`, `destroy`. Bypass bug'ı için test notu: bassFilter her zaman mid/side sahnesinden geçer.

## 4. Veri Şeması (sıfırdan)

`supabase/migrations/001_init.sql` tek kaynak:

- `users(id uuid pk default auth.uid(), username text, email text, avatar_url text, created_at timestamptz default now(), display_settings jsonb default '{}')`
- `songs(id uuid pk default gen_random_uuid(), user_id uuid references users, title text not null, artist text, duration int, audio_url text not null, cover_url text, lyrics text, likes_count int default 0, created_at timestamptz default now())`
- `playlists(id uuid pk, user_id uuid, title text, cover_url text, is_auto bool default false, created_at)` + `playlist_songs(playlist_id uuid, song_id uuid, added_at, pk(playlist_id,song_id))`
- `friends(user_id uuid, friend_id uuid, status text check (status in ('pending','accepted')), created_at, pk(user_id,friend_id))`
- Storage: `songs` (audio/*, public read, auth write), `covers` (public read).
- RLS: herkes okur, sadece sahibi yazar. `friends` sadece ilgili iki kullanıcı görür.
- `last_seen`, `year` kolonları YOK. Trivia Yıllar modu `songs.created_at` yılını kullanır, eski şarkılarda "Belirsiz" yazar.
- Eski `supabase-fixes.sql`, `migration.sql`, `migration_v10.sql` v10'da silinir, yerine bu dosya.

## 5. Electron / .exe

- `package.json` version `10.0.0`, scripts:
  - `dev`: `vite`
  - `typecheck`: `tsc --noEmit`
  - `build:web`: `vite build`
  - `build:exe`: `node scripts/build-exe.mjs` (ytdlp + build + portable&nsis + latest.yml)
- `electron-builder` config korunur (appId `com.waveify.app`, portable + nsis, `bin/` extraResources, `app-update.yml`, publish github tugraeker/Waveify).
- yt-dlp: `bin/` pinli versiyon, `download-ytdlp.mjs` retry(3) + sha check + net hata mesajı. `Import.tsx` progress bar + log kutusu.
- `deepLink`: `waveify://song/<uuid>`, `waveify://playlist/<uuid>` -> HashRouter `#/song/<id>` yönlendirmesi. Windows registry (nsis) + portable komut satırı argümanı.
- `updater`: `electron-updater` + `UpdateBanner`, `latest.yml` release'te.
- Tray + `TitleBar` (frameless) + Media Session tuşları korunur.

## 6. UX Sadeleşmesi (kod aynı, kullanım rahat)

Sidebar 4 grup:
- Ana: Home `/`, Search `/search`, Library `/library`
- Paylaş: Upload `/upload`, Import `/import`, Friends `/friends`, Chat `/chat`, Sync `/sync-room`
- Oyna: Queue `/queue`, NowPlaying `/now-playing`, Charts `/charts`, Discover `/discover`, Radio `/radio`, Podcast `/podcast`
- Stüdyo+Oyun (collapsed): Studio, VisualLab, LiveSessions, AIDJ, BeatMaker içine, Trivia `/trivia`, Badges, Stats, History, Settings

Parçalama:
- NowPlaying 52KB -> `NowPlayingPage` (orkestra) + `PlayerBar` + `EffectsPanel` + `LyricsPanel` + `StageView` + `QueueInline` (her biri <10KB hedef).
- Chat 48KB -> `ChatPage` + `ConversationList` + `MessageView` + `useChat` (mevcut hook sadeleşir).
- UserProfile 39KB -> `ProfileHeader` + `ProfileStats` + `BadgeRow`.
- Settings 29KB -> sekmeli: Profil / Görünüm / Ses / Veri / Hakkında.

Her route: `<RouteErrorBoundary>` + `Toast` + boş-durum (örn: "Katalogda X şarkı var, Drop için 4 lazım — Yükle'ye git").

## 7. Test / Doğrulama

- `npm run typecheck` temiz.
- `npm run build:web` temiz.
- `.exe` smoke: açılış <10sn, local MP3 çal, Upload ile 1 şarkı, Import ile 1 YouTube (kısa), Sync-Room 2 istemci aynı anda, offline cache.
- 30 Hash route manuel checklist (`#/` ... `#/studio`).
- Bilinen tuzaklar: PowerShell BOM (build.gradle yazarken BOM'suz UTF-8), `year`/`last_seen` sorgulama yasağı, Hash'siz URL'nin Home'a düşmesi (normal).

## 8. Release Planı (v10-rewrite -> main)

1. Bu branch'te rewrite, commit'ler Türkçe + Conventional (`feat(player): ...`).
2. `supabase/migrations/001_init.sql` + README ile yeni Supabase projesi kurulur, `.env` doldurulur (anahtarlar commitlenmez).
3. `npm run build:exe` -> `release/Waveify-10.0.0-portable.exe` + Setup.
4. PR `v10-rewrite` -> `main`, review, squash merge.
5. Tag `v10.0.0` + GitHub Release'e exe'ler yüklenir, `website/index.html` linkleri güncellenir.
6. `WhatsNewModal` v10 notlarıyla.

## 9. Riskler

- 30 sayfanın hepsini tek PR'de taşımak büyük diff yapar — fazlı commit'lerle (core -> player -> library -> social -> gamify -> studio -> electron) ilerlenecek.
- `waveify-v9.0.0-web.zip` ve `release/` repo'yu şişirir — v10'da `release/` + `*.zip` `.gitignore`'da kalır, release asset olarak yüklenir.
- Token güvenliği: bu spec'te ve kodda hiçbir secret yok. `.env` asla commitlenmez.
