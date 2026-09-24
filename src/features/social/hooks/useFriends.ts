import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../core/supabaseClient';
import { useStore } from '@/store/store';

export interface FriendUser {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  user?: { id: string; username: string };
  friend?: { id: string; username: string };
}

export function useFriends() {
  const { user } = useStore();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pending, setPending] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: acceptedSent } = await supabase
      .from('friends')
      .select('*, friend:friend_id(id, username, email, avatar_url)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');
    const { data: acceptedReceived } = await supabase
      .from('friends')
      .select('*, user:user_id(id, username, email, avatar_url)')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');
    const { data: incoming } = await supabase
      .from('friends')
      .select('*, user:user_id(id, username)')
      .eq('friend_id', user.id)
      .eq('status', 'pending');
    const { data: outgoing } = await supabase
      .from('friends')
      .select('*, friend:friend_id(id, username)')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    const all: FriendUser[] = [];
    acceptedSent?.forEach((f: any) => f.friend && all.push(f.friend));
    acceptedReceived?.forEach((f: any) => f.user && all.push(f.user));
    setFriends(all);
    setPending((incoming || []) as FriendRequest[]);
    setSent((outgoing || []) as FriendRequest[]);
  }, [user?.id]);

  useEffect(() => {
    if (user) refresh();
  }, [user?.id, refresh]);

  const accept = useCallback(
    async (friendUserId: string) => {
      if (!user) return;
      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendUserId)
        .eq('friend_id', user.id);
      await refresh();
    },
    [user?.id, refresh]
  );

  const reject = useCallback(
    async (friendUserId: string) => {
      if (!user) return;
      await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendUserId)
        .eq('friend_id', user.id);
      await refresh();
    },
    [user?.id, refresh]
  );

  const cancel = useCallback(
    async (friendUserId: string) => {
      if (!user) return;
      await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendUserId);
      await refresh();
    },
    [user?.id, refresh]
  );

  return { friends, pending, sent, accept, reject, cancel, refresh };
}
