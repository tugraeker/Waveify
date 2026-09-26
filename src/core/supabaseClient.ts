import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kjyjjqxqsbmrravhcuoc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqeWpqcXhxc2JtcnJhdmhjdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzUwNDgsImV4cCI6MjEwMDE1MTA0OH0.fB6dlkOcT-fPW6bsTvwj0XnbUbLiKmhzz4LxQ8r28g8';
if (!supabaseUrl || !supabaseKey) console.error('Supabase bilgileri eksik! .env dosyasini kontrol et.');
export const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);
