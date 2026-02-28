"use client";

import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineStore } from "@/stores/use-timeline-store";

export function TimelinePlayhead() {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const zoom = useTimelineStore((s) => s.zoom);

  const x = currentTime * zoom;

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: x }}
    >
      {/* Triangle head */}
      <div
        className="w-0 h-0 -ml-[5px]"
        style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid var(--playhead)",
        }}
      />
      {/* Vertical line */}
      <div className="w-px h-full bg-[var(--playhead)] -mt-px" />
    </div>
  );
}
