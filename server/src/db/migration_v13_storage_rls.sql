-- Fix storage RLS for avatar and banner uploads
-- Create covers bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;

-- Allow authenticated users to upload any file to covers bucket
CREATE POLICY "Allow upload covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers');

-- Allow authenticated users to update files in covers bucket
CREATE POLICY "Allow update covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers')
  WITH CHECK (bucket_id = 'covers');

-- Allow public read on covers bucket
CREATE POLICY "Allow read covers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'covers');

-- Allow authenticated users to delete files in covers bucket
CREATE POLICY "Allow delete covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers');
