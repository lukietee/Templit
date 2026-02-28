import { create } from "zustand";

export interface Clip {
  id: string;
  start: number;
  duration: number;
  label: string;
}

export interface Track {
  id: string;
  type: "video" | "audio";
  label: string;
  clips: Clip[];
}

interface TimelineState {
  tracks: Track[];
  zoom: number; // pixels per second
  scrollLeft: number;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollLeft: (scrollLeft: number) => void;
  setClipDuration: (trackId: string, clipId: string, duration: number) => void;
}

export const useTimelineStore = create<TimelineState>()((set) => ({
  tracks: [
    {
      id: "video-1",
      type: "video",
      label: "Video",
      clips: [{ id: "clip-v1", start: 0, duration: 0, label: "sample-video.mp4" }],
    },
    {
      id: "audio-1",
      type: "audio",
      label: "Audio",
      clips: [{ id: "clip-a1", start: 0, duration: 0, label: "Audio Track" }],
    },
  ],
  zoom: 50,
  scrollLeft: 0,

  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(200, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(200, s.zoom + 10) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(10, s.zoom - 10) })),
  setScrollLeft: (scrollLeft) => set({ scrollLeft }),
  setClipDuration: (trackId, clipId, duration) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              clips: t.clips.map((c) =>
                c.id === clipId ? { ...c, duration } : c
              ),
            }
          : t
      ),
    })),
}));
