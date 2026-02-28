import { create } from "zustand";

export interface Clip {
  id: string;
  sourceId: string;
  start: number;
  duration: number;
  originalStart: number;
  originalDuration: number;
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
  selectedClipId: string | null;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScrollLeft: (scrollLeft: number) => void;
  setClipDuration: (trackId: string, clipId: string, duration: number) => void;
  selectClip: (clipId: string) => void;
  clearSelection: () => void;
  trimClipStart: (clipId: string, deltaTime: number) => void;
  trimClipEnd: (clipId: string, deltaTime: number) => void;
}

const MIN_DURATION = 0.1;

export const useTimelineStore = create<TimelineState>()((set) => ({
  tracks: [
    {
      id: "video-1",
      type: "video",
      label: "Video",
      clips: [
        {
          id: "clip-v1",
          sourceId: "source-1",
          start: 0,
          duration: 0,
          originalStart: 0,
          originalDuration: 0,
          label: "sample-video.mp4",
        },
      ],
    },
    {
      id: "audio-1",
      type: "audio",
      label: "Audio",
      clips: [
        {
          id: "clip-a1",
          sourceId: "source-1",
          start: 0,
          duration: 0,
          originalStart: 0,
          originalDuration: 0,
          label: "Audio Track",
        },
      ],
    },
  ],
  zoom: 50,
  scrollLeft: 0,
  selectedClipId: null,

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
                c.id === clipId
                  ? {
                      ...c,
                      duration,
                      originalStart: c.originalDuration === 0 ? c.start : c.originalStart,
                      originalDuration: c.originalDuration === 0 ? duration : c.originalDuration,
                    }
                  : c
              ),
            }
          : t
      ),
    })),

  selectClip: (clipId) => set({ selectedClipId: clipId }),
  clearSelection: () => set({ selectedClipId: null }),

  trimClipStart: (clipId, deltaTime) =>
    set((s) => {
      // Find the clip and its sourceId
      let sourceId: string | null = null;
      for (const t of s.tracks) {
        for (const c of t.clips) {
          if (c.id === clipId) {
            sourceId = c.sourceId;
            break;
          }
        }
        if (sourceId) break;
      }
      if (!sourceId) return s;

      return {
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.sourceId !== sourceId) return c;

            // deltaTime > 0 means trimming inward (moving start forward)
            const newStart = c.start + deltaTime;
            const newDuration = c.duration - deltaTime;

            // Clamp: can't go before originalStart
            const clampedStart = Math.max(c.originalStart, newStart);
            // Clamp: duration must stay >= MIN_DURATION
            const clampedDuration = Math.max(MIN_DURATION, newDuration - (clampedStart - newStart));
            // Recalculate start based on clamped duration
            const finalStart = c.start + c.duration - clampedDuration;

            return { ...c, start: finalStart, duration: clampedDuration };
          }),
        })),
      };
    }),

  trimClipEnd: (clipId, deltaTime) =>
    set((s) => {
      let sourceId: string | null = null;
      for (const t of s.tracks) {
        for (const c of t.clips) {
          if (c.id === clipId) {
            sourceId = c.sourceId;
            break;
          }
        }
        if (sourceId) break;
      }
      if (!sourceId) return s;

      return {
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.sourceId !== sourceId) return c;

            // deltaTime > 0 means extending outward (making clip longer)
            const newDuration = c.duration + deltaTime;

            // Clamp: can't exceed original end
            const maxDuration = c.originalStart + c.originalDuration - c.start;
            const clampedDuration = Math.min(maxDuration, Math.max(MIN_DURATION, newDuration));

            return { ...c, duration: clampedDuration };
          }),
        })),
      };
    }),
}));
