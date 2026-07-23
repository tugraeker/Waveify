-- Waveify v8 - Chat system (Discord-like servers, channels, messages)

CREATE TABLE IF NOT EXISTS public.chat_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_url TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.chat_servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.chat_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_servers_select' AND tablename = 'chat_servers') THEN
    CREATE POLICY "chat_servers_select" ON public.chat_servers FOR SELECT USING (
      id IN (SELECT server_id FROM public.chat_server_members WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_servers_insert' AND tablename = 'chat_servers') THEN
    CREATE POLICY "chat_servers_insert" ON public.chat_servers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_server_members_select' AND tablename = 'chat_server_members') THEN
    CREATE POLICY "chat_server_members_select" ON public.chat_server_members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_server_members_insert' AND tablename = 'chat_server_members') THEN
    CREATE POLICY "chat_server_members_insert" ON public.chat_server_members FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_channels_select' AND tablename = 'chat_channels') THEN
    CREATE POLICY "chat_channels_select" ON public.chat_channels FOR SELECT USING (
      server_id IN (SELECT server_id FROM public.chat_server_members WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_messages_select' AND tablename = 'chat_messages') THEN
    CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT USING (
      channel_id IN (SELECT c.id FROM public.chat_channels c JOIN public.chat_server_members m ON c.server_id = m.server_id WHERE m.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_messages_insert' AND tablename = 'chat_messages') THEN
    CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_channels_server ON public.chat_channels(server_id);
CREATE INDEX IF NOT EXISTS idx_chat_server_members_user ON public.chat_server_members(user_id);
