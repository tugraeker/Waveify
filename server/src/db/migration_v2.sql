-- Sesli - Ek Özellikler Migrasyonu

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Playlist songs are public' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Playlist songs are public" ON public.playlist_songs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own playlist songs' AND tablename = 'playlist_songs') THEN
    CREATE POLICY "Users can manage own playlist songs" ON public.playlist_songs FOR ALL USING (
      EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
    );
  END IF;
END $$;
