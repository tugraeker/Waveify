import { create } from 'zustand';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { supabase } from '../core/supabaseClient';

interface UserState {
  user: SupabaseUser | null;
  profile: User | null;
  setUser: (user: SupabaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  fetchProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ profile: null });
      return;
    }
    const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    if (data) set({ profile: data as User });
  },
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
