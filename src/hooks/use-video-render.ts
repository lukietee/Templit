import { useState, useCallback, useRef } from "react";
import { usePlaybackStore } from "@/stores/use-playback-store";
import { useTimelineStore } from "@/stores/use-timeline-store";

export function useVideoRender(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const abortRef = useRef(false);

  const renderVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isRendering) return;

    const tracks = useTimelineStore.getState().tracks;
    const videoClip = tracks.find((t) => t.type === "video")?.clips[0];
    const audioClip = tracks.find((t) => t.type === "audio")?.clips[0];

    if (!videoClip || videoClip.duration <= 0) return;

    const clipStart = videoClip.start;
    const clipEnd = videoClip.start + videoClip.duration;
    const clipDuration = videoClip.duration;

    // Save previous state
    const wasPlaying = usePlaybackStore.getState().isPlaying;
    if (wasPlaying) usePlaybackStore.getState().pause();

    setIsRendering(true);
    setRenderProgress(0);
    abortRef.current = false;

    // Seek to clip start and wait
    video.currentTime = clipStart;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
    });

    // Set up capture stream
    const stream = (video as HTMLVideoElement & { captureStream: (fps?: number) => MediaStream }).captureStream();

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
    video.muted = false;
    await video.play();

    // rAF loop to track progress and stop at clip end
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (abortRef.current) {
          video.pause();
          recorder.stop();
          resolve();
          return;
        }

        const t = video.currentTime;

        // Audio clip muting
        if (audioClip && audioClip.duration > 0) {
          const audioStart = audioClip.start;
          const audioEnd = audioClip.start + audioClip.duration;
          video.muted = t < audioStart || t >= audioEnd;
        }

        // Progress
        const elapsed = t - clipStart;
        setRenderProgress(Math.min(1, elapsed / clipDuration));

        // Check if done
        if (t >= clipEnd) {
          video.pause();
          recorder.stop();
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await renderDone;

    // Restore state
    video.muted = false;
    setRenderProgress(1);
    setIsRendering(false);
  }, [videoRef, isRendering]);

  return { renderVideo, isRendering, renderProgress };
}
