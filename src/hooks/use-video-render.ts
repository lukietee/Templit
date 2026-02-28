import { useState, useCallback, useRef } from "react";
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

/** Seek video and wait for the seek to complete. */
function seekAndWait(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

export function useVideoRender(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const abortRef = useRef(false);

  const renderVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isRendering) return;

    const videoClips = getClipsByType("video").filter((c) => c.duration > 0);
    if (videoClips.length === 0) return;

    const totalDuration = videoClips.reduce((sum, c) => sum + c.duration, 0);

    // Save previous state
    const wasPlaying = usePlaybackStore.getState().isPlaying;
    if (wasPlaying) usePlaybackStore.getState().pause();

    setIsRendering(true);
    setRenderProgress(0);
    abortRef.current = false;

    // Seek to start of first clip's source position
    await seekAndWait(video, videoClips[0].originalStart);

    // Set up capture stream
    const stream = (
      video as HTMLVideoElement & { captureStream: (fps?: number) => MediaStream }
    ).captureStream();

    // Choose codec
    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const renderDone = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "render.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      };
    });

    recorder.start();

    // Process clips sequentially
    let totalRendered = 0;

    for (let i = 0; i < videoClips.length; i++) {
      if (abortRef.current) break;

      const clip = videoClips[i];
      const clipSourceStart = clip.originalStart;
      const clipSourceEnd = clip.originalStart + clip.duration;

      // Seek to clip's source start position and wait
      await seekAndWait(video, clipSourceStart);

      // Play this clip segment
      video.muted = false;
      await video.play();

      // rAF loop: record until the source reaches clip end
      const clipRenderedBefore = totalRendered;
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (abortRef.current) {
            video.pause();
            resolve();
            return;
          }

          const sourceTime = video.currentTime;

          // Map source time back to timeline time for audio muting check
          const timelineTime = clip.start + (sourceTime - clip.originalStart);

          // Audio: mute/unmute based on whether any audio clip covers this timeline time
          const audioClips = getClipsByType("audio");
          const audioClip = findClipAtTime(audioClips, timelineTime);
          video.muted = !audioClip;

          // Progress
          const elapsedInClip = sourceTime - clipSourceStart;
          totalRendered = clipRenderedBefore + Math.max(0, elapsedInClip);
          setRenderProgress(Math.min(1, totalRendered / totalDuration));

          // Check if clip segment is done
          if (sourceTime >= clipSourceEnd) {
            video.pause();
            totalRendered = clipRenderedBefore + clip.duration;
            setRenderProgress(Math.min(1, totalRendered / totalDuration));
            resolve();
            return;
          }

          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    // Stop recording
    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    await renderDone;

    // Restore state
    video.muted = false;
    setRenderProgress(1);
    setIsRendering(false);
  }, [videoRef, isRendering]);

  return { renderVideo, isRendering, renderProgress };
}
