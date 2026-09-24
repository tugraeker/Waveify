import { useEffect, useState } from 'react';
import { supabase } from '../../../core/supabaseClient';

export function useSongs() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setSongs(data ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  return { songs, loading, error, refresh };
}
