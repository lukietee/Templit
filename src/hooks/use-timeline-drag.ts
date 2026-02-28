import { useCallback, useRef } from "react";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineStore } from "@/stores/use-timeline-store";

export function useTimelineDrag(
  seekTo: (time: number) => void,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const wasPlayingRef = useRef(false);

  const getTimeFromX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const zoom = useTimelineStore.getState().zoom;
      const scrollLeft = container.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      const time = x / zoom;
      const duration = usePlaybackStore.getState().duration;
      return Math.max(0, Math.min(duration, time));
    },
    [containerRef]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      useTimelineStore.getState().clearSelection();
      const { isPlaying, pause, setIsSeeking } = usePlaybackStore.getState();
      wasPlayingRef.current = isPlaying;
      if (isPlaying) pause();
      setIsSeeking(true);

      const time = getTimeFromX(e.clientX);
      seekTo(time);

      const onMouseMove = (e: MouseEvent) => {
        const time = getTimeFromX(e.clientX);
        seekTo(time);
      };

      const onMouseUp = () => {
        const { setIsSeeking, play } = usePlaybackStore.getState();
        setIsSeeking(false);
        if (wasPlayingRef.current) play();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getTimeFromX, seekTo]
  );

  return { onMouseDown };
}
