"use client";

import { useRef } from "react";
import { useVideoSync } from "@/frontend/hooks/use-video-sync";
import { useKeyboardShortcuts } from "@/frontend/hooks/use-keyboard-shortcuts";
import { usePlaybackStore } from "@/frontend/stores/use-playback-store";
import { PlaybackControls } from "./playback-controls";

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = usePlaybackStore((s) => s.videoSrc);
  const { seekTo } = useVideoSync(videoRef);
  useKeyboardShortcuts(seekTo);

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* Video container */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          className="max-w-full max-h-full"
          playsInline
        />
      </div>

      {/* Controls */}
      <PlaybackControls />
    </div>
  );
}
