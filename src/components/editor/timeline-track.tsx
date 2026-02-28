"use client";

import { Clip, Track } from "@/stores/use-timeline-store";
import { useTimelineStore } from "@/stores/use-timeline-store";
import { useClipTrim } from "@/hooks/use-clip-trim";
import { Film, Music } from "lucide-react";

interface TimelineClipProps {
  clip: Clip;
  clipColor: string;
  zoom: number;
  isSelected: boolean;
  onSelect: (clipId: string) => void;
}

function TimelineClip({ clip, clipColor, zoom, isSelected, onSelect }: TimelineClipProps) {
  const { onTrimStart, onTrimEnd } = useClipTrim(clip.id);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id);
  };

  return (
    <div
      className="absolute top-1 bottom-1 rounded-md flex items-center overflow-hidden"
      style={{
        left: clip.start * zoom,
        width: Math.max(clip.duration * zoom, 2),
        backgroundColor: clipColor,
        boxShadow: isSelected ? "0 0 0 2px var(--accent)" : undefined,
        cursor: "pointer",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Left trim handle */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/30 hover:bg-white/60 z-10"
          style={{ cursor: "ew-resize" }}
          onMouseDown={onTrimStart}
        />
      )}

      <span className="text-[10px] text-white font-medium truncate px-2">
        {clip.label}
      </span>

      {/* Right trim handle */}
      {isSelected && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/30 hover:bg-white/60 z-10"
          style={{ cursor: "ew-resize" }}
          onMouseDown={onTrimEnd}
        />
      )}
    </div>
  );
}

interface TimelineTrackProps {
  track: Track;
}

export function TimelineTrack({ track }: TimelineTrackProps) {
  const zoom = useTimelineStore((s) => s.zoom);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);

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
          <TimelineClip
            key={clip.id}
            clip={clip}
            clipColor={clipColor}
            zoom={zoom}
            isSelected={selectedClipId === clip.id}
            onSelect={selectClip}
          />
        ))}
      </div>
    </div>
  );
}
