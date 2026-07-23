-- Migration v7: Bug fixes
-- Run this in Supabase SQL Editor

-- 1. Fix song_artists RLS (disable RLS so inserts work)
ALTER TABLE public.song_artists DISABLE ROW LEVEL SECURITY;

-- 2. Admin delete user function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  DELETE FROM public.song_artists WHERE user_id = target_user_id;
  DELETE FROM public.songs WHERE user_id = target_user_id;
  DELETE FROM public.listen_history WHERE user_id = target_user_id;
  DELETE FROM public.likes WHERE user_id = target_user_id;
  DELETE FROM public.badges WHERE user_id = target_user_id;
  DELETE FROM public.friends WHERE user_id = target_user_id OR friend_id = target_user_id;
  DELETE FROM public.playlist_songs WHERE playlist_id IN (SELECT id FROM public.playlists WHERE user_id = target_user_id);
  DELETE FROM public.playlists WHERE user_id = target_user_id;
  DELETE FROM public.activities WHERE user_id = target_user_id;
  DELETE FROM public.users WHERE id = target_user_id;
END;
$$;
