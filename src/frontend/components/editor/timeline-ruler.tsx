"use client";

import { usePlaybackStore } from "@/frontend/stores/use-playback-store";
import { useTimelineStore } from "@/frontend/stores/use-timeline-store";

function formatRulerTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimelineRuler() {
  const duration = usePlaybackStore((s) => s.duration);
  const zoom = useTimelineStore((s) => s.zoom);

  // Adaptive tick interval based on zoom level
  let interval = 1;
  if (zoom < 20) interval = 10;
  else if (zoom < 40) interval = 5;
  else if (zoom < 80) interval = 2;

  const totalWidth = duration * zoom;
  const ticks: { time: number; x: number }[] = [];
  for (let t = 0; t <= duration; t += interval) {
    ticks.push({ time: t, x: t * zoom });
  }

  return (
    <div
      className="relative h-6 border-b border-[var(--border)] bg-[var(--timeline-ruler)] select-none"
      style={{ width: totalWidth || "100%" }}
    >
      {ticks.map((tick) => (
        <div
          key={tick.time}
          className="absolute top-0 h-full flex flex-col items-start"
          style={{ left: tick.x }}
        >
          <div className="w-px h-2.5 bg-[var(--muted-foreground)]" />
          <span className="text-[9px] text-[var(--muted-foreground)] ml-1 leading-none mt-0.5">
            {formatRulerTime(tick.time)}
          </span>
        </div>
      ))}
    </div>
  );
}
