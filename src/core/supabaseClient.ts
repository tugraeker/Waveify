import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';
if (!supabaseUrl || !supabaseKey) console.error('Supabase bilgileri eksik! .env dosyasini kontrol et.');
export const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);
