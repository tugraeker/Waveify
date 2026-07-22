-- Waveify v5 - listen_history RLS & Upload accounts
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. listen_history RLS
ALTER TABLE public.listen_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Listen history select own' AND tablename = 'listen_history') THEN
    CREATE POLICY "Listen history select own" ON public.listen_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Listen history insert own' AND tablename = 'listen_history') THEN
    CREATE POLICY "Listen history insert own" ON public.listen_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Listen history delete own' AND tablename = 'listen_history') THEN
    CREATE POLICY "Listen history delete own" ON public.listen_history
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. playlist_songs RLS
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs select' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs select" ON public.playlist_songs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs insert' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs insert" ON public.playlist_songs
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs delete' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs delete" ON public.playlist_songs
      FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.playlists WHERE id = playlist_id));
  END IF;
END $$;

-- 3. Upload accounts (shared artist accounts)
CREATE TABLE IF NOT EXISTS public.upload_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.upload_account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.upload_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  UNIQUE(account_id, user_id)
);

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS upload_account_id UUID REFERENCES public.upload_accounts(id);

ALTER TABLE public.upload_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_account_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload accounts select' AND tablename = 'upload_accounts') THEN
    CREATE POLICY "Upload accounts select" ON public.upload_accounts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload account members select' AND tablename = 'upload_account_members') THEN
    CREATE POLICY "Upload account members select" ON public.upload_account_members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload account members insert' AND tablename = 'upload_account_members') THEN
    CREATE POLICY "Upload account members insert" ON public.upload_account_members
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
