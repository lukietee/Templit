"use client";

import { useRef } from "react";
import { useTimelineStore } from "@/stores/use-timeline-store";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineDrag } from "@/hooks/use-timeline-drag";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineTrack } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { ZoomIn, ZoomOut } from "lucide-react";

interface TimelineProps {
  seekTo: (time: number) => void;
}

export function Timeline({ seekTo }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tracks, zoom, zoomIn, zoomOut } = useTimelineStore();
  const duration = usePlaybackStore((s) => s.duration);
  const { onMouseDown } = useTimelineDrag(seekTo, containerRef);

  const totalWidth = duration * zoom;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--foreground)]">Timeline</span>
        <div className="flex-1" />
        <button
          onClick={zoomOut}
          className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-[var(--muted-foreground)] min-w-[32px] text-center">
          {zoom}px/s
        </span>
        <button
          onClick={zoomIn}
          className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable timeline area */}
      <div className="flex-1 min-h-0 flex">
        {/* Fixed track labels column - rendered by each track */}
        {/* Scrollable content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative"
          onMouseDown={onMouseDown}
        >
          <div style={{ minWidth: totalWidth || "100%" }}>
            <TimelineRuler />
            {tracks.map((track) => (
              <TimelineTrack key={track.id} track={track} />
            ))}
          </div>
          <TimelinePlayhead />
        </div>
      </div>
    </div>
  );
}
