import { create } from "zustand";

interface ProjectState {
  topic: string | null;
  duration: string | null;
  aspectRatio: string | null;
  updateField: (key: "topic" | "duration" | "aspectRatio", value: string) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  topic: null,
  duration: null,
  aspectRatio: null,

  updateField: (key, value) => set({ [key]: value }),

  resetProject: () => set({ topic: null, duration: null, aspectRatio: null }),
}));
