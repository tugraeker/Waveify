-- Waveify v10 - Global top songs RPC (bypass RLS on listen_history)

CREATE OR REPLACE FUNCTION public.get_top_songs(limit_count INTEGER DEFAULT 50, since_days INTEGER DEFAULT 0)
RETURNS TABLE (id UUID, user_id UUID, title TEXT, artist TEXT, duration REAL, audio_url TEXT, cover_url TEXT, likes_count INTEGER, plays_count BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.user_id, s.title, s.artist, s.duration, s.audio_url, s.cover_url, s.likes_count, COUNT(lh.id)::BIGINT AS plays_count, s.created_at
    FROM public.songs s
    LEFT JOIN public.listen_history lh ON s.id = lh.song_id
    WHERE (since_days <= 0 OR lh.played_at >= NOW() - (since_days || ' days')::INTERVAL)
    GROUP BY s.id
    ORDER BY plays_count DESC, s.likes_count DESC
    LIMIT limit_count;
END;
$$;
