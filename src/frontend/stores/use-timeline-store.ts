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
  moveClip: (clipId: string, newStart: number) => void;
  deleteClip: (clipId: string) => void;
  addClip: (trackId: string, clip: Clip) => void;
  addTrack: (type: "video" | "audio") => void;
  removeTrack: (trackId: string) => void;
  setTracks: (tracks: Track[]) => void;
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
    set((s) => ({
      tracks: s.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;

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
    })),

  trimClipEnd: (clipId, deltaTime) =>
    set((s) => ({
      tracks: s.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;

          // deltaTime > 0 means extending outward (making clip longer)
          const newDuration = c.duration + deltaTime;

          // Clamp: can't exceed original end
          const maxDuration = c.originalStart + c.originalDuration - c.start;
          const clampedDuration = Math.min(maxDuration, Math.max(MIN_DURATION, newDuration));

          return { ...c, duration: clampedDuration };
        }),
      })),
    })),

  moveClip: (clipId, newStart) =>
    set((s) => ({
      tracks: s.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId ? { ...c, start: Math.max(0, newStart) } : c
        ),
      })),
    })),

  deleteClip: (clipId) =>
    set((s) => ({
      selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      tracks: s.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
    })),

  addClip: (trackId, clip) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      ),
    })),

  addTrack: (type) =>
    set((s) => {
      const count = s.tracks.filter((t) => t.type === type).length + 1;
      const id = `${type}-${Date.now()}`;
      const label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}`;
      return {
        tracks: [...s.tracks, { id, type, label, clips: [] }],
      };
    }),

  removeTrack: (trackId) =>
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== trackId),
    })),

  setTracks: (tracks) => set({ tracks }),
}));
