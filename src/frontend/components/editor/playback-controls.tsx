"use client";

import { usePlaybackStore } from "@/frontend/stores/use-playback-store";
import { Play, Pause, Volume2 } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlaybackControls() {
  const { isPlaying, currentTime, duration, volume, togglePlay, setVolume } =
    usePlaybackStore();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-t border-[var(--border)]">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Time display */}
      <span className="text-xs font-mono text-[var(--muted-foreground)] min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Volume */}
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
