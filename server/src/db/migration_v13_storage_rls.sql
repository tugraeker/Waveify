-- Fix storage RLS for avatar uploads
-- Create covers bucket if not exists (Supabase management, run manually if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload files to covers/avatars/
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND
    (storage.foldername(name))[1] = 'avatars'
  );

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = 'avatars')
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = 'avatars');

-- Allow public read on covers bucket
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
CREATE POLICY "Public read covers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'covers');

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
CREATE POLICY "Avatar delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = 'avatars');
