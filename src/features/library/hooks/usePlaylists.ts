import { useEffect, useState } from 'react';
import { supabase } from '../../../core/supabaseClient';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setPlaylists(data ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  return { playlists, loading, error, refresh };
}
