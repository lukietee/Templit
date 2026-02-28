"use client";

import { useRef } from "react";
import { useTimelineStore } from "@/stores/use-timeline-store";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineDrag } from "@/hooks/use-timeline-drag";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineTrack } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { ZoomIn, ZoomOut, Download, Loader2, Plus, Film, Music } from "lucide-react";

interface TimelineProps {
  seekTo: (time: number) => void;
  onRender?: () => void;
  isRendering?: boolean;
  renderProgress?: number;
}

export function Timeline({ seekTo, onRender, isRendering, renderProgress }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tracks, zoom, zoomIn, zoomOut, addTrack } = useTimelineStore();
  const duration = usePlaybackStore((s) => s.duration);
  const { onMouseDown } = useTimelineDrag(seekTo, containerRef);

  const totalWidth = duration * zoom;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--foreground)]">Timeline</span>
        <div className="flex-1" />
        {onRender && (
          <button
            onClick={onRender}
            disabled={isRendering}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={isRendering ? "Rendering..." : "Export video"}
          >
            {isRendering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {Math.round((renderProgress ?? 0) * 100)}%
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export
              </>
            )}
          </button>
        )}
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
            {/* Add Track row */}
            <div className="flex h-10 border-b border-[var(--border)]">
              <div className="flex items-center gap-1.5 px-3 bg-white">
                <button
                  onClick={() => addTrack("video")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Add video track"
                >
                  <Plus className="w-3 h-3" />
                  <Film className="w-3 h-3" />
                </button>
                <button
                  onClick={() => addTrack("audio")}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Add audio track"
                >
                  <Plus className="w-3 h-3" />
                  <Music className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 bg-[var(--track-bg)]" />
            </div>
          </div>
          <TimelinePlayhead />
        </div>
      </div>
    </div>
  );
}
