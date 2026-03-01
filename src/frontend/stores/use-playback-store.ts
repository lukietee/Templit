import { create } from "zustand";

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isSeeking: boolean;
  videoSrc: string;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsSeeking: (seeking: boolean) => void;
  setVideoSrc: (src: string) => void;
}

export const usePlaybackStore = create<PlaybackState>()((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isSeeking: false,
  videoSrc: "/sample-video.mp4",

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setIsSeeking: (seeking) => set({ isSeeking: seeking }),
  setVideoSrc: (src) => set({ videoSrc: src }),
}));
