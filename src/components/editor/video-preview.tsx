"use client";

import { useRef } from "react";
import { useVideoSync } from "@/hooks/use-video-sync";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PlaybackControls } from "./playback-controls";

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { seekTo } = useVideoSync(videoRef);
  useKeyboardShortcuts(seekTo);

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* Video container */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/sample-video.mp4"
          className="max-w-full max-h-full"
          playsInline
        />
      </div>

      {/* Controls */}
      <PlaybackControls />
    </div>
  );
}
