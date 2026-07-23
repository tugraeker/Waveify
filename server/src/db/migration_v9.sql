-- Waveify v9 - Fix chat tables RLS (disable for simplicity, like song_artists)

ALTER TABLE public.chat_servers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_server_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
