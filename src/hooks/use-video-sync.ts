import { useEffect, useRef, useCallback } from "react";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineStore, Clip } from "@/stores/use-timeline-store";

/** Collect all clips from tracks of the given type, sorted by timeline start. */
function getClipsByType(type: "video" | "audio"): Clip[] {
  const tracks = useTimelineStore.getState().tracks;
  const clips: Clip[] = [];
  for (const track of tracks) {
    if (track.type === type) {
      clips.push(...track.clips);
    }
  }
  clips.sort((a, b) => a.start - b.start);
  return clips;
}

/** Return the clip that contains the given timeline time, or null. */
function findClipAtTime(clips: Clip[], time: number): Clip | null {
  for (const clip of clips) {
    if (clip.duration <= 0) continue;
    if (clip.start <= time && time < clip.start + clip.duration) {
      return clip;
    }
  }
  return null;
}

/** Return the next clip that starts strictly after the given time, or null. */
function findNextClip(clips: Clip[], time: number): Clip | null {
  for (const clip of clips) {
    if (clip.duration <= 0) continue;
    if (clip.start > time) return clip;
  }
  return null;
}

/** Map a timeline time to the source video time for a given clip. */
function timelineToSource(clip: Clip, timelineTime: number): number {
  return clip.originalStart + (timelineTime - clip.start);
}

export function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const seekSourceRef = useRef<"user" | "video">("video");
  const rafRef = useRef<number>(0);

  const { isPlaying, currentTime, volume, setCurrentTime, setDuration, pause } =
    usePlaybackStore();

  // Sync play/pause state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const videoClips = getClipsByType("video");
      let targetClip = findClipAtTime(videoClips, currentTime);

      // If currentTime is in a gap, jump to the next clip's start
      if (!targetClip) {
        targetClip = findNextClip(videoClips, currentTime);
        if (targetClip) {
          seekSourceRef.current = "video";
          setCurrentTime(targetClip.start);
        }
      }

      if (!targetClip) {
        // No clips to play at or after currentTime — don't play
        pause();
        return;
      }

      // Seek source video to the correct position within the clip
      const sourceTime = timelineToSource(targetClip, targetClip === findClipAtTime(videoClips, currentTime) ? currentTime : targetClip.start);
      const tolerance = 0.1;
      if (Math.abs(video.currentTime - sourceTime) > tolerance) {
        video.currentTime = sourceTime;
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
      // Map timeline time to source time for the clip at the seek target
      const videoClips = getClipsByType("video");
      const clip = findClipAtTime(videoClips, currentTime);
      if (clip) {
        video.currentTime = timelineToSource(clip, currentTime);
      }
      seekSourceRef.current = "video";
    }
  }, [currentTime, videoRef]);

  // rAF loop for smooth playhead updates during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const tick = () => {
      const videoClips = getClipsByType("video");
      const audioClips = getClipsByType("audio");

      // Determine which video clip the current timeline time falls within
      const playbackTime = usePlaybackStore.getState().currentTime;
      const activeClip = findClipAtTime(videoClips, playbackTime);

      if (activeClip) {
        // Map source video time back to timeline time
        const expectedSourceTime = timelineToSource(activeClip, playbackTime);
        const tolerance = 0.1;
        if (Math.abs(video.currentTime - expectedSourceTime) > tolerance) {
          video.currentTime = expectedSourceTime;
        }

        // Advance timeline time based on source video's current position
        const newTimelineTime = activeClip.start + (video.currentTime - activeClip.originalStart);
        const clipEnd = activeClip.start + activeClip.duration;

        if (newTimelineTime >= clipEnd) {
          // Current clip ended — find next video clip
          const nextClip = findNextClip(videoClips, activeClip.start);
          if (nextClip) {
            // Seek to start of next clip
            video.currentTime = nextClip.originalStart;
            seekSourceRef.current = "video";
            setCurrentTime(nextClip.start);
          } else {
            // No more clips — pause
            video.pause();
            seekSourceRef.current = "video";
            setCurrentTime(clipEnd);
            pause();
            return;
          }
        } else {
          seekSourceRef.current = "video";
          setCurrentTime(newTimelineTime);
        }
      } else {
        // Current time is in a gap — jump to next clip
        const nextClip = findNextClip(videoClips, playbackTime);
        if (nextClip) {
          video.currentTime = nextClip.originalStart;
          seekSourceRef.current = "video";
          setCurrentTime(nextClip.start);
        } else {
          // No more clips — pause
          video.pause();
          seekSourceRef.current = "video";
          pause();
          return;
        }
      }

      // Audio: mute/unmute based on whether any audio clip covers current timeline time
      const tlTime = usePlaybackStore.getState().currentTime;
      const audioClip = findClipAtTime(audioClips, tlTime);
      video.muted = !audioClip;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, videoRef, setCurrentTime, pause]);

  // Set duration on loadedmetadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      const videoDuration = video.duration;
      setDuration(videoDuration);

      // Set duration on the first video clip and first audio clip if they have zero duration
      const tracks = useTimelineStore.getState().tracks;
      const setClipDuration = useTimelineStore.getState().setClipDuration;
      for (const track of tracks) {
        if (track.clips.length > 0) {
          const firstClip = track.clips[0];
          if (firstClip.duration === 0) {
            setClipDuration(track.id, firstClip.id, videoDuration);
          }
        }
      }
    };

    // If already loaded
    if (video.readyState >= 1) {
      onLoaded();
    }

    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [videoRef, setDuration]);

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
