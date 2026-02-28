import { useCallback, useRef } from "react";
import { useTimelineStore } from "@/frontend/stores/use-timeline-store";

export function useClipDrag(clipId: string) {
  const initialXRef = useRef(0);
  const initialStartRef = useRef(0);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      initialXRef.current = e.clientX;

      // Capture the clip's current start position
      const state = useTimelineStore.getState();
      for (const track of state.tracks) {
        for (const clip of track.clips) {
          if (clip.id === clipId) {
            initialStartRef.current = clip.start;
            break;
          }
        }
      }

      document.body.style.cursor = "grabbing";

      const onMouseMove = (e: MouseEvent) => {
        const zoom = useTimelineStore.getState().zoom;
        const totalDeltaX = e.clientX - initialXRef.current;
        const newStart = initialStartRef.current + totalDeltaX / zoom;
        useTimelineStore.getState().moveClip(clipId, newStart);
      };

      const onMouseUp = () => {
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [clipId]
  );

  return { onDragStart };
}
