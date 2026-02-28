"use client";

import { Track } from "@/stores/use-timeline-store";
import { useTimelineStore } from "@/stores/use-timeline-store";
import { Film, Music } from "lucide-react";

interface TimelineTrackProps {
  track: Track;
}

export function TimelineTrack({ track }: TimelineTrackProps) {
  const zoom = useTimelineStore((s) => s.zoom);

  const Icon = track.type === "video" ? Film : Music;
  const clipColor =
    track.type === "video" ? "var(--clip-video)" : "var(--clip-audio)";

  return (
    <div className="flex h-12 border-b border-[var(--border)]">
      {/* Fixed label */}
      <div className="w-24 flex-shrink-0 flex items-center gap-2 px-3 bg-white border-r border-[var(--border)]">
        <Icon className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        <span className="text-xs font-medium text-[var(--foreground)]">
          {track.label}
        </span>
      </div>

      {/* Clips area */}
      <div className="flex-1 relative bg-[var(--track-bg)]">
        {track.clips.map((clip) => (
          <div
            key={clip.id}
            className="absolute top-1 bottom-1 rounded-md flex items-center px-2 overflow-hidden"
            style={{
              left: clip.start * zoom,
              width: Math.max(clip.duration * zoom, 2),
              backgroundColor: clipColor,
            }}
          >
            <span className="text-[10px] text-white font-medium truncate">
              {clip.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
