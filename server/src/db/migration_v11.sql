-- Waveify v11 - Fix get_top_songs return types (match songs table exactly)

DROP FUNCTION IF EXISTS public.get_top_songs(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_top_songs(limit_count INTEGER DEFAULT 50, since_days INTEGER DEFAULT 0)
RETURNS SETOF public.songs
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT s.*
    FROM public.songs s
    LEFT JOIN public.listen_history lh ON s.id = lh.song_id
    WHERE (since_days <= 0 OR lh.played_at >= NOW() - (since_days || ' days')::INTERVAL)
    GROUP BY s.id
    ORDER BY COUNT(lh.id) DESC, s.likes_count DESC
    LIMIT limit_count;
END;
$$;
