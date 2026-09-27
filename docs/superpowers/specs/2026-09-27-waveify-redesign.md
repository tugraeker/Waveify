# Waveify v10-design — Midnight OLED + Asit Redesign Spec

Tarih: 2026-09-27. Branch: `v10-design` (ustune v10-slim).
Yon: Midnight OLED + asit lime, sinematik player, sayfa sayfa rewrite (Yaklasim B).

## 1. Tokenlar (tum sayfalarin alfabesi)
- Zemin: #000000 saf siyah. Yuzey: #0A0F0A (yesile calan siyah), ikinci yuzey #101810.
- Vurgu: asit lime #C6FF3E (aktif link, buton, ilerleme, odak). Ikincil: buz mavisi #7DF9FF (sadece detay/uyari).
- Metin: #F2FFF0 birincil, #8AA088 soluk.
- Sekil: kartlar 4px keskin kose, butonlar hap (pill). Gradient YOK (duz renkler).
- Font: display Space Grotesk 700 (dev basliklar clamp(40px,6vw,96px)), govde Inter.
- Hareket: 160ms snappy gecisler; sayfa girisi yukari kayma + yumusama (fadeUp 240ms).
- Cam efektleri (backdrop-blur) ATILIR — OLED dostu duz renkler.
- Eski mor kimlik (wave-*) KALDIRILIR; tailwind wave/surface tokenlari yeni degerlere baglanir
  (sinif isimleri ayni kalir, degerler degisir — sayfalar yavas yavas gecer).

## 2. Kabuk (her ekranda gorunenler)
- Sidebar 220px: lime kare monogram + "WVFY", PRO rozeti yok, aktif link lime sol bar + beyaz metin.
- Player bar 76px: 56px keskin kapak, ince lime ilerleme cizgisi (tiklanabilir), minimal kontroller.
- TitleBar saf siyah; MobileNav/MobilePlayer ayni dil.
- Agir ekstralar (HeyWave/Bubble/Banner/WhatsNew) idle-sonrasi yuklenmeye devam eder.

## 3. Sayfa sistemi (4 parti)
- Parti 1 — NowPlaying sinematik: dev kapak sol, sagda dev tipografi + sozler,
  kapaktan orneklenen ortam parlamasi, lime ilerleme. Efekt paneli yok (motor efektsiz).
- Parti 2 — Liste sayfalari (Home/Search/Library/Queue/Playlist/History):
  ortak dev satir karti (buyuk kapak, hover lime), dev basliklar.
- Parti 3 — Form sayfalari (Upload/Import/CreatePlaylist/Settings/Profile):
  keskin input (4px), hap lime birincil buton, bol beyaz alan yerine siyah + lime odak.
- Parti 4 — Sosyal + detay (Friends/Chat/SyncRoom/SongDetail/Artist/Admin/Auth): ayni dil.

## 4. Kapsam disi
- Davranis degisikligi YOK (sadece gorunum). Ses motoruna dokunulmaz.
- Eski mor/glass siniflar sayfalardan parti parti temizlenir; token dosyasi tek seferde degisir.
- Her parti ayri commit + typecheck + build. Finalde exe + push.

## 5. Dogrulama
- `npx tsc --noEmit` 0 hata, `vite build` OK, exe smoke (ac + cal).
- Goz kontrolu: saf siyah zemin, lime vurgular, dev tipografi, blur kalmamasi.
