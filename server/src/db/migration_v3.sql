-- Waveify v3 - Yeni Özellikler Migrasyonu
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. Bio alanı (v2'de eklenmediyse)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Playlist collaborator
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(playlist_id, user_id)
);

-- 3. Activity feed
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Badges / achievements
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- 5. Listen history index for faster queries
CREATE INDEX IF NOT EXISTS idx_listen_history_user ON public.listen_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listen_history_played ON public.listen_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);

-- 6. RLS policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;

-- Activities policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Activities select' AND tablename = 'activities') THEN
    CREATE POLICY "Activities select" ON public.activities FOR SELECT USING (
      user_id IN (SELECT friend_id FROM public.friends WHERE user_id = auth.uid() AND status = 'accepted')
      OR user_id = auth.uid()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Activities insert' AND tablename = 'activities') THEN
    CREATE POLICY "Activities insert" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Badges policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Badges select' AND tablename = 'badges') THEN
    CREATE POLICY "Badges select" ON public.badges FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Badges insert' AND tablename = 'badges') THEN
    CREATE POLICY "Badges insert" ON public.badges FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Playlist collaborators policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist collaborators select' AND tablename = 'playlist_collaborators') THEN
    CREATE POLICY "Playlist collaborators select" ON public.playlist_collaborators FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist collaborators insert' AND tablename = 'playlist_collaborators') THEN
    CREATE POLICY "Playlist collaborators insert" ON public.playlist_collaborators FOR INSERT WITH CHECK (
      auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.playlist_collaborators WHERE playlist_id = playlist_id)
    );
  END IF;
END $$;
