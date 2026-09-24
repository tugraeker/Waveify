import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { useUserStore } from '../stores/userStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useUserStore.getState().setUser(data.session?.user ?? null);
      if (data.session?.user) void useUserStore.getState().fetchProfile();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      useUserStore.getState().setUser(session?.user ?? null);
      if (session?.user) void useUserStore.getState().fetchProfile();
      else useUserStore.getState().setProfile(null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
  return <>{children}</>;
}

export default AuthProvider;
