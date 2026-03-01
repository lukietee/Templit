import { create } from "zustand";
import type { CharacterGroup, SceneImage } from "./use-chat-store";

interface ProjectState {
  overview: string | null;
  characterImages: CharacterGroup[];
  sceneLocationImages: SceneImage[];
  sceneThumbnailImages: SceneImage[];
  setOverview: (content: string) => void;
  setCharacterImages: (images: CharacterGroup[]) => void;
  setSceneLocationImages: (images: SceneImage[]) => void;
  setSceneThumbnailImages: (images: SceneImage[]) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  overview: null,
  characterImages: [],
  sceneLocationImages: [],
  sceneThumbnailImages: [],
  setOverview: (content) => set({ overview: content }),
  setCharacterImages: (images) => set({ characterImages: images }),
  setSceneLocationImages: (images) => set({ sceneLocationImages: images }),
  setSceneThumbnailImages: (images) => set({ sceneThumbnailImages: images }),
  resetProject: () =>
    set({
      overview: null,
      characterImages: [],
      sceneLocationImages: [],
      sceneThumbnailImages: [],
    }),
}));
