-- ============================================================================
-- WAVEIFY · Supabase düzeltme paketi (tek seferlik)
-- Kullanım: Supabase Dashboard > SQL Editor > yapıştır > RUN
-- Güvenli: tekrar çalıştırılabilir (idempotent)
-- ============================================================================

-- 1) users.display_settings (Bulut Senkron + troll kutusu)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_settings jsonb DEFAULT '{}'::jsonb;

-- 2) songs.year (Drop Modu — Yıllar)
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS year int;

-- 3) Storage bucket'ları (avatar kapakları + şarkı dosyaları)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('covers', 'covers', true),
  ('songs', 'songs', true)
ON CONFLICT (id) DO NOTHING;

-- 3b) listen_history.played_at default (geçmiş kaydı yazılmıyordu)
ALTER TABLE public.listen_history ALTER COLUMN played_at SET DEFAULT now();
ALTER TABLE public.listen_history ALTER COLUMN played_at SET NOT NULL;

-- 4) Storage policy'leri (public okuma + giriş yapan kullanıcı yükleme)
DROP POLICY IF EXISTS "covers_read_all" ON storage.objects;
CREATE POLICY "covers_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "songs_read_all" ON storage.objects;
CREATE POLICY "songs_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'songs');
DROP POLICY IF EXISTS "covers_upload_auth" ON storage.objects;
CREATE POLICY "covers_upload_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');
DROP POLICY IF EXISTS "songs_upload_auth" ON storage.objects;
CREATE POLICY "songs_upload_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'songs');
DROP POLICY IF EXISTS "covers_update_own" ON storage.objects;
CREATE POLICY "covers_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'covers' AND owner = auth.uid());
DROP POLICY IF EXISTS "covers_delete_own" ON storage.objects;
CREATE POLICY "covers_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers' AND owner = auth.uid());

-- ============================================================================
-- 5) Tablo RLS policy'leri (önce policy, sonra ENABLE — mevcut erişim korunur)
-- ============================================================================

-- listen_history (Arkadaş Blend'i, arkadaş etkinliği, istatistikler)
DROP POLICY IF EXISTS "lh_select" ON public.listen_history;
CREATE POLICY "lh_select" ON public.listen_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "lh_insert" ON public.listen_history;
CREATE POLICY "lh_insert" ON public.listen_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "lh_delete" ON public.listen_history;
CREATE POLICY "lh_delete" ON public.listen_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.listen_history ENABLE ROW LEVEL SECURITY;

-- likes (beğeniler — hem normal kullanıcı hem şarkı sahibi yazabilmeli değil; sadece kendi beğenisi)
DROP POLICY IF EXISTS "likes_select" ON public.likes;
CREATE POLICY "likes_select" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "likes_insert" ON public.likes;
CREATE POLICY "likes_insert" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete" ON public.likes;
CREATE POLICY "likes_delete" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- comments (şarkı yorumları)
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- playlists (kullanıcı çalma listeleri)
DROP POLICY IF EXISTS "pl_select" ON public.playlists;
CREATE POLICY "pl_select" ON public.playlists FOR SELECT USING (true);
DROP POLICY IF EXISTS "pl_insert" ON public.playlists;
CREATE POLICY "pl_insert" ON public.playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pl_update" ON public.playlists;
CREATE POLICY "pl_update" ON public.playlists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pl_delete" ON public.playlists;
CREATE POLICY "pl_delete" ON public.playlists FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- playlist_songs (listeye şarkı ekleme — sadece listenin sahibi)
DROP POLICY IF EXISTS "ps_select" ON public.playlist_songs;
CREATE POLICY "ps_select" ON public.playlist_songs FOR SELECT USING (true);
DROP POLICY IF EXISTS "ps_insert" ON public.playlist_songs;
CREATE POLICY "ps_insert" ON public.playlist_songs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "ps_delete" ON public.playlist_songs;
CREATE POLICY "ps_delete" ON public.playlist_songs FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
);
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- friends (arkadaşlık — istek atan kendi user_id'siyle yazar, istek kabulü karşı taraf günceller)
DROP POLICY IF EXISTS "friends_select" ON public.friends;
CREATE POLICY "friends_select" ON public.friends FOR SELECT USING (true);
DROP POLICY IF EXISTS "friends_insert" ON public.friends;
CREATE POLICY "friends_insert" ON public.friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "friends_update" ON public.friends;
CREATE POLICY "friends_update" ON public.friends FOR UPDATE TO authenticated USING (auth.uid() = friend_id);
DROP POLICY IF EXISTS "friends_delete" ON public.friends;
CREATE POLICY "friends_delete" ON public.friends FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- blocks (engelleme — tablo yoksa önce oluştur)
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, blocked_id)
);
DROP POLICY IF EXISTS "blocks_select" ON public.blocks;
CREATE POLICY "blocks_select" ON public.blocks FOR SELECT USING (true);
DROP POLICY IF EXISTS "blocks_insert" ON public.blocks;
CREATE POLICY "blocks_insert" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "blocks_delete" ON public.blocks;
CREATE POLICY "blocks_delete" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- badges (admin verir, herkes görür)
DROP POLICY IF EXISTS "badges_select" ON public.badges;
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "badges_insert" ON public.badges;
CREATE POLICY "badges_insert" ON public.badges FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "badges_delete" ON public.badges;
CREATE POLICY "badges_delete" ON public.badges FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- song_artists (iş birliği ekleme)
DROP POLICY IF EXISTS "sa_select" ON public.song_artists;
CREATE POLICY "sa_select" ON public.song_artists FOR SELECT USING (true);
DROP POLICY IF EXISTS "sa_insert" ON public.song_artists;
CREATE POLICY "sa_insert" ON public.song_artists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.song_artists ENABLE ROW LEVEL SECURITY;

-- users (profil güncelleme — sadece kendisi + admin; admin silme/yetki)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- songs (şarkı güncelleme/silme: sahibi veya admin; ekleme: kendisi)
DROP POLICY IF EXISTS "songs_insert" ON public.songs;
CREATE POLICY "songs_insert" ON public.songs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "songs_update" ON public.songs;
CREATE POLICY "songs_update" ON public.songs FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "songs_delete" ON public.songs;
CREATE POLICY "songs_delete" ON public.songs FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6) 4gxnt (demir.oz1211@gmail.com) profil sıfırlama — gerekirse çalıştır
-- ============================================================================
-- UPDATE public.users SET avatar_url = NULL, banner_url = NULL, bio = NULL
-- WHERE email = 'demir.oz1211@gmail.com';
