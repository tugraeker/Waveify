-- Waveify - Veritabanı Şeması
-- Bu dosyanın TAMAMINI Supabase SQL Editor'de çalıştırın

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  duration INTEGER DEFAULT 0,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  lyrics TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  type TEXT DEFAULT 'custom' CHECK (type IN ('custom', 'auto')),
  auto_type TEXT CHECK (auto_type IN ('top50', 'friends_top', 'weekly', 'latest', 'liked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(song_id)
);

CREATE TABLE IF NOT EXISTS public.listen_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== STORAGE BUCKETS ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('songs', 'songs', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

-- NOT: Storage RLS politikaları Supabase Dashboard'dan manuel eklenmeli
-- Bak: https://supabase.com adresinde Storage sekmesi → Policies

-- ========== TABLE RLS ==========
ALTER TABLE public.songs ENABLE ROW LEVEL security;
ALTER TABLE public.playlists ENABLE ROW LEVEL security;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL security;
ALTER TABLE public.friends ENABLE ROW LEVEL security;
ALTER TABLE public.likes ENABLE ROW LEVEL security;
ALTER TABLE public.comments ENABLE ROW LEVEL security;

-- Songs
DROP POLICY IF EXISTS "Songs public select" ON public.songs;
DROP POLICY IF EXISTS "Songs insert own" ON public.songs;
DROP POLICY IF EXISTS "Songs delete own" ON public.songs;
DROP POLICY IF EXISTS "Songs update own" ON public.songs;
CREATE POLICY "Songs public select" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Songs insert own" ON public.songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Songs delete own" ON public.songs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Songs update own" ON public.songs FOR UPDATE USING (auth.uid() = user_id);

-- Playlists
DROP POLICY IF EXISTS "Playlists public select" ON public.playlists;
DROP POLICY IF EXISTS "Playlists manage own" ON public.playlists;
CREATE POLICY "Playlists public select" ON public.playlists FOR SELECT USING (true);
CREATE POLICY "Playlists manage own" ON public.playlists FOR ALL USING (auth.uid() = user_id);

-- Playlist songs
DROP POLICY IF EXISTS "Playlist songs public select" ON public.playlist_songs;
DROP POLICY IF EXISTS "Playlist songs insert" ON public.playlist_songs;
DROP POLICY IF EXISTS "Playlist songs delete" ON public.playlist_songs;
CREATE POLICY "Playlist songs public select" ON public.playlist_songs FOR SELECT USING (true);
CREATE POLICY "Playlist songs insert" ON public.playlist_songs FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));
CREATE POLICY "Playlist songs delete" ON public.playlist_songs FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));

-- Friends
DROP POLICY IF EXISTS "Friends select own" ON public.friends;
DROP POLICY IF EXISTS "Friends send request" ON public.friends;
DROP POLICY IF EXISTS "Friends accept request" ON public.friends;
CREATE POLICY "Friends select own" ON public.friends FOR SELECT USING (auth.uid() IN (user_id, friend_id));
CREATE POLICY "Friends send request" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Friends accept request" ON public.friends FOR UPDATE USING (auth.uid() = friend_id);
CREATE POLICY "Friends delete" ON public.friends FOR DELETE USING (auth.uid() IN (user_id, friend_id));

-- Likes
DROP POLICY IF EXISTS "Likes public select" ON public.likes;
DROP POLICY IF EXISTS "Likes insert" ON public.likes;
DROP POLICY IF EXISTS "Likes delete" ON public.likes;
CREATE POLICY "Likes public select" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Likes insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Likes delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Comments public select" ON public.comments;
DROP POLICY IF EXISTS "Comments create" ON public.comments;
CREATE POLICY "Comments public select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments create" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
