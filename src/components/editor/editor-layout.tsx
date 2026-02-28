"use client";

import { useRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ChatPlaceholder } from "@/components/chat/chat-placeholder";
import { Timeline } from "./timeline";
import { useVideoSync } from "@/hooks/use-video-sync";
import { useVideoRender } from "@/hooks/use-video-render";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function EditorLayout() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { seekTo } = useVideoSync(videoRef);
  const { renderVideo, isRendering, renderProgress } = useVideoRender(videoRef);
  useKeyboardShortcuts(seekTo);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Group orientation="horizontal">
        {/* Chat panel */}
        <Panel defaultSize="25%" minSize="15%">
          <ChatPlaceholder />
        </Panel>

        <Separator className="w-1.5 bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-col-resize" />

        {/* Editor panel */}
        <Panel defaultSize="75%" minSize="40%">
          <Group orientation="vertical">
            {/* Preview */}
            <Panel defaultSize="60%" minSize="30%">
              <VideoPreviewWithRef videoRef={videoRef} isRendering={isRendering} />
            </Panel>

            <Separator className="h-1.5 bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-row-resize" />

            {/* Timeline */}
            <Panel defaultSize="40%" minSize="15%">
              <Timeline
                seekTo={seekTo}
                onRender={renderVideo}
                isRendering={isRendering}
                renderProgress={renderProgress}
              />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

function VideoPreviewWithRef({
  videoRef,
  isRendering,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isRendering: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/sample-video.mp4"
          className="max-w-full max-h-full"
          playsInline
        />
      </div>
      <PlaybackControlsBar isRendering={isRendering} />
    </div>
  );
}

// Inline playback controls to avoid circular ref issues
import { usePlaybackStore } from "@/stores/use-playback-store";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2 } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlaybackControlsBar({ isRendering }: { isRendering: boolean }) {
  const { isPlaying, currentTime, duration, volume, togglePlay, setVolume } =
    usePlaybackStore();

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 bg-white border-t border-[var(--border)]",
      isRendering && "opacity-50 pointer-events-none"
    )}>
      <button
        onClick={togglePlay}
        disabled={isRendering}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <span className="text-xs font-mono text-[var(--muted-foreground)] min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 h-1 accent-[var(--accent)]"
        />
      </div>
    </div>
  );
}
