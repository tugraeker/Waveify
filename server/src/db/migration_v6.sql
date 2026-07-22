-- Waveify v6 - Admin SECURITY DEFINER functions
-- Tümünü Supabase SQL Editor'de çalıştır

-- 1. Bozuk policy'leri temizle, RLS'yi kapat
DROP POLICY IF EXISTS "Users select own" ON public.users;
DROP POLICY IF EXISTS "Admin select all users" ON public.users;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Admin check
CREATE OR REPLACE FUNCTION public.admin_check()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true);
END;
$$;

-- 3. Admin get users
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS SETOF public.users
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
END;
$$;

-- 4. Admin get stats
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS TABLE(users bigint, songs bigint, plays bigint)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT count(*) FROM public.users),
      (SELECT count(*) FROM public.songs),
      (SELECT count(*) FROM public.listen_history);
END;
$$;

-- 5. Admin delete song
CREATE OR REPLACE FUNCTION public.admin_delete_song(song_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  DELETE FROM public.songs WHERE id = song_id;
END;
$$;

-- 6. Admin toggle admin
CREATE OR REPLACE FUNCTION public.admin_toggle_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  UPDATE public.users SET is_admin = NOT is_admin WHERE id = target_user_id;
END;
$$;

-- 7. Admin get user song counts
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE(user_id UUID, song_count BIGINT, play_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      (SELECT count(*) FROM public.songs WHERE user_id = u.id)::bigint,
      (SELECT count(*) FROM public.listen_history lh WHERE lh.song_id IN (SELECT id FROM public.songs WHERE user_id = u.id))::bigint
    FROM public.users u;
END;
$$;

-- 8. Admin get songs with user info
CREATE OR REPLACE FUNCTION public.admin_get_songs()
RETURNS SETOF public.songs
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY SELECT * FROM public.songs ORDER BY created_at DESC LIMIT 200;
END;
$$;

-- 8. Song artists (çoklu kullanıcı)
CREATE TABLE IF NOT EXISTS public.song_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(song_id, user_id)
);

-- RLS gerekli değil, sadece eşleme tablosu

-- 8. Playlist_songs RLS (non-recursive)
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs select all' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs select all" ON public.playlist_songs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs insert owner' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs insert owner" ON public.playlist_songs
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs delete owner' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs delete owner" ON public.playlist_songs
      FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));
  END IF;
END $$;

-- 8. Schema cache yenile
NOTIFY pgrst, 'reload schema';
