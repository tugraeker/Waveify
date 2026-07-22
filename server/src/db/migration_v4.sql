-- Waveify v4 - Admin & Badge Sistemi
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. Admin alanı
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Badge görünen ad ve renk
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'wave';
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES public.users(id);
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 3. Admin için song delete policy (admin her şeyi silebilir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can delete any song' AND tablename = 'songs') THEN
    CREATE POLICY "Admin can delete any song" ON public.songs
      FOR DELETE USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));
  END IF;
END $$;

-- 4. Badge insert/delete sadece admin
DROP POLICY IF EXISTS "Badges insert" ON public.badges;
CREATE POLICY "Badges insert" ON public.badges FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
);
CREATE POLICY "Badges delete" ON public.badges FOR DELETE USING (
  auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
);

-- 5. Admin kullanıcıları güncelleyebilir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can update users' AND tablename = 'users') THEN
    CREATE POLICY "Admin can update users" ON public.users
      FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));
  END IF;
END $$;
