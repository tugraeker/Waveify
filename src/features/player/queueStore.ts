import { create } from 'zustand';
import type { Song } from '@/types';

interface QueueState {
  queue: Song[];
  setQueue: (queue: Song[]) => void;
  shuffle: boolean;
  setShuffle: (shuffle: boolean) => void;
  enqueue: (song: Song) => void;
  dequeue: (index: number) => void;
  shuffleQueue: () => void;
  // verbatim aliases from src/store/store.ts
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  queue: [],
  setQueue: (queue) => set({ queue }),
  shuffle: false,
  setShuffle: (shuffle) => set({ shuffle }),
  enqueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
  dequeue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
  shuffleQueue: () => set((state) => {
    const q = [...state.queue];
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    return { queue: q };
  }),
  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
  removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
}));
