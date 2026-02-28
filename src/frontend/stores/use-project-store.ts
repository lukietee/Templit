import { create } from "zustand";

interface ProjectState {
  overview: string | null;
  setOverview: (content: string) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  overview: null,
  setOverview: (content) => set({ overview: content }),
  resetProject: () => set({ overview: null }),
}));
