"use client";

import { Clip, Track } from "@/stores/use-timeline-store";
import { useTimelineStore } from "@/stores/use-timeline-store";
import { useClipTrim } from "@/hooks/use-clip-trim";
import { useClipDrag } from "@/hooks/use-clip-drag";

interface TimelineClipProps {
  clip: Clip;
  clipColor: string;
  zoom: number;
  isSelected: boolean;
  onSelect: (clipId: string) => void;
}

function TimelineClip({ clip, clipColor, zoom, isSelected, onSelect }: TimelineClipProps) {
  const { onTrimStart, onTrimEnd } = useClipTrim(clip.id);
  const { onDragStart } = useClipDrag(clip.id);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(clip.id);
    onDragStart(e);
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
  const clipColor =
    track.type === "video" ? "var(--clip-video)" : "var(--clip-audio)";

  return (
    <div className="group/track h-12 border-b border-[var(--border)] relative bg-[var(--track-bg)]">
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
  );
}
