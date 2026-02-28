import { useCallback, useRef } from "react";
import { useTimelineStore } from "@/frontend/stores/use-timeline-store";

export function useClipTrim(clipId: string) {
  const lastXRef = useRef(0);

  const onTrimStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      lastXRef.current = e.clientX;
      document.body.style.cursor = "ew-resize";

      const onMouseMove = (e: MouseEvent) => {
        const zoom = useTimelineStore.getState().zoom;
        const deltaX = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        const deltaTime = deltaX / zoom;
        useTimelineStore.getState().trimClipStart(clipId, deltaTime);
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

  const onTrimEnd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      lastXRef.current = e.clientX;
      document.body.style.cursor = "ew-resize";

      const onMouseMove = (e: MouseEvent) => {
        const zoom = useTimelineStore.getState().zoom;
        const deltaX = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        const deltaTime = deltaX / zoom;
        useTimelineStore.getState().trimClipEnd(clipId, deltaTime);
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

  return { onTrimStart, onTrimEnd };
}
