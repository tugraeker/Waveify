import { create } from 'zustand';
import type { Song } from '@/types';
import { audioEngine } from './audioEngine.v2';

interface PlayerState {
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  volume: number;
  setVolume: (vol: number) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  repeat: 'off' | 'all' | 'one';
  setRepeat: (repeat: 'off' | 'all' | 'one') => void;
  play: (song?: Song) => void;
  pause: () => void;
  seek: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  setCurrentSong: (song) => set({ currentSong: song }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  volume: 0.7,
  setVolume: (vol) => set({ volume: vol }),
  playbackRate: 1,
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  repeat: 'off',
  setRepeat: (repeat) => set({ repeat }),
  play: (song) => {
    if (song) set({ currentSong: song });
    const target = song ?? get().currentSong;
    if (target?.audio_url) {
      try { audioEngine.play(target.audio_url); } catch { /* audio not ready in tests */ }
    }
    set({ isPlaying: true });
  },
  pause: () => {
    try { audioEngine.pause(); } catch { /* noop */ }
    set({ isPlaying: false });
  },
  seek: (time) => {
    if (isNaN(time) || time < 0) return;
    try { audioEngine.seek(time); } catch { /* noop */ }
    set({ currentTime: time });
  },
}));
