import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/use-playback-store";

export function useKeyboardShortcuts(
  seekTo: (time: number) => void
) {
  const togglePlay = usePlaybackStore((s) => s.togglePlay);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft": {
          e.preventDefault();
          const { currentTime } = usePlaybackStore.getState();
          seekTo(Math.max(0, currentTime - 1 / 30));
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const { currentTime, duration } = usePlaybackStore.getState();
          seekTo(Math.min(duration, currentTime + 1 / 30));
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, seekTo]);
}
