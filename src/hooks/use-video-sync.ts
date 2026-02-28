import { useEffect, useRef, useCallback } from "react";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineStore, Clip } from "@/stores/use-timeline-store";

function getClip(type: "video" | "audio"): Clip | undefined {
  return useTimelineStore.getState().tracks.find((t) => t.type === type)
    ?.clips[0];
}

export function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const seekSourceRef = useRef<"user" | "video">("video");
  const rafRef = useRef<number>(0);

  const { isPlaying, currentTime, volume, setCurrentTime, setDuration, pause } =
    usePlaybackStore();
  const setClipDuration = useTimelineStore((s) => s.setClipDuration);

  // Sync play/pause state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      // If currentTime is outside clip range, seek to clip start first
      const clip = getClip("video");
      if (clip && clip.duration > 0) {
        const clipEnd = clip.start + clip.duration;
        if (video.currentTime < clip.start || video.currentTime >= clipEnd) {
          video.currentTime = clip.start;
          seekSourceRef.current = "video";
          setCurrentTime(clip.start);
        }
      }
      video.play().catch(() => {
        pause();
      });
    } else {
      video.pause();
    }
  }, [isPlaying, videoRef, pause, setCurrentTime]);

  // Sync volume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
  }, [volume, videoRef]);

  // Sync user seeks (from store) to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (seekSourceRef.current === "user") {
      video.currentTime = currentTime;
      seekSourceRef.current = "video";
    }
  }, [currentTime, videoRef]);

  // rAF loop for smooth playhead updates during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const tick = () => {
      // Enforce video clip end boundary
      const videoClip = getClip("video");
      if (videoClip && videoClip.duration > 0) {
        const clipEnd = videoClip.start + videoClip.duration;
        if (video.currentTime >= clipEnd) {
          video.pause();
          seekSourceRef.current = "video";
          setCurrentTime(clipEnd);
          pause();
          return;
        }
      }

      // Mute/unmute based on audio clip range
      const audioClip = getClip("audio");
      if (audioClip && audioClip.duration > 0) {
        const audioStart = audioClip.start;
        const audioEnd = audioClip.start + audioClip.duration;
        const t = video.currentTime;
        video.muted = t < audioStart || t >= audioEnd;
      }

      seekSourceRef.current = "video";
      setCurrentTime(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, videoRef, setCurrentTime, pause]);

  // Set duration + clip durations on loadedmetadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration);
      setClipDuration("video-1", "clip-v1", video.duration);
      setClipDuration("audio-1", "clip-a1", video.duration);
    };

    // If already loaded
    if (video.readyState >= 1) {
      onLoaded();
    }

    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [videoRef, setDuration, setClipDuration]);

  // Handle video ending
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => pause();
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [videoRef, pause]);

  // Expose a seek function that sets the source flag
  const seekTo = useCallback(
    (time: number) => {
      seekSourceRef.current = "user";
      setCurrentTime(time);
    },
    [setCurrentTime]
  );

  return { seekTo };
}
