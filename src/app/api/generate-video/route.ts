import { getOpenAI, SORA_MODEL } from "@/backend/gemini";
import { toFile } from "openai";
import sharp from "sharp";
import type { VideoSize, VideoSeconds } from "openai/resources/videos";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export const maxDuration = 600; // 10 minutes — Sora video generation is slow

const MAX_RETRIES = 2;
const POLL_INTERVAL_MS = 5_000; // 5 seconds
const POLL_TIMEOUT_MS = 540_000; // 9 minutes — leaves headroom within maxDuration

// Map common aspect ratio strings to clean values (e.g., "16:9 (landscape)" → "16:9")
function cleanAspectRatio(ar: string): string {
  const cleaned = ar.replace(/[()]/g, "").trim().toLowerCase();
  if (cleaned.includes("9:16")) return "9:16";
  if (cleaned.includes("1:1")) return "1:1";
  if (cleaned.includes("4:3")) return "4:3";
  if (cleaned.includes("3:4")) return "3:4";
  return "16:9"; // default landscape
}

// Map aspect ratio to Sora 2 size parameter
function aspectRatioToSize(ar: string): VideoSize {
  switch (ar) {
    case "9:16": return "720x1280";
    case "4:3":  return "1280x720"; // closest landscape
    case "3:4":  return "720x1280"; // closest portrait
    default:     return "1280x720"; // 16:9 landscape
  }
}

interface SceneInput {
  title: string;
  description: string;
  dialogue?: string;
  image: { data: string; mimeType: string };
}

interface SceneVideoOutput {
  title: string;
  video: { data: string; mimeType: string };
}

function buildVideoPrompt(
  scene: SceneInput,
  artisticStyle: string,
  durationSeconds: number
): string {
  let prompt = `Generate a cinematic ${durationSeconds}-second video clip for this scene from a video storyboard.

Scene: ${scene.title}
Description: ${scene.description}`;

  if (scene.dialogue) {
    prompt += `\nDialogue: ${scene.dialogue}`;
  }

  if (artisticStyle) {
    prompt += `\nArtistic Style: ${artisticStyle}`;
  }

  prompt += `

Requirements:
- Create smooth, cinematic motion based on the scene description
- Maintain visual consistency with the provided reference image
- Include natural camera movement appropriate for the scene
- The video should feel like a professional film clip`;

  return prompt;
}

async function generateSceneVideo(
  scene: SceneInput,
  artisticStyle: string,
  size: VideoSize,
  sceneDuration: VideoSeconds
): Promise<SceneVideoOutput> {
  const prompt = buildVideoPrompt(scene, artisticStyle, Number(sceneDuration));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Resize image to match Sora's required video dimensions
      const [width, height] = size.split("x").map(Number);
      const imageBuffer = Buffer.from(scene.image.data, "base64");
      const resizedBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit: "cover" })
        .jpeg()
        .toBuffer();
      const imageFile = await toFile(resizedBuffer, "reference.jpeg", {
        type: "image/jpeg",
      });

      // Create video with image reference
      let video = await getOpenAI().videos.create({
        model: SORA_MODEL,
        prompt,
        input_reference: imageFile,
        size,
        seconds: sceneDuration,
      });

      // Poll until complete
      const startTime = Date.now();
      while (video.status === "queued" || video.status === "in_progress") {
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          throw new Error(`Polling timeout for "${scene.title}"`);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        video = await getOpenAI().videos.retrieve(video.id);
      }

      if (video.status === "failed") {
        throw new Error(
          `Sora generation failed for "${scene.title}": ${video.error?.message || "unknown error"}`
        );
      }

      // Download the generated video
      const response = await getOpenAI().videos.downloadContent(video.id);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      return {
        title: scene.title,
        video: { data: base64, mimeType: "video/mp4" },
      };
    } catch (err) {
      console.warn(
        `Attempt ${attempt}/${MAX_RETRIES} for "${scene.title}" failed:`,
        err
      );
      if (attempt === MAX_RETRIES) throw err;
    }
  }

  throw new Error(`All retries failed for "${scene.title}"`);
}

async function stitchVideos(
  sceneVideos: SceneVideoOutput[]
): Promise<{ data: string; mimeType: string }> {
  const tempDir = await mkdtemp(join(tmpdir(), "templit-stitch-"));
  const tempFiles: string[] = [];

  try {
    // Write each scene video to a temp file
    for (let i = 0; i < sceneVideos.length; i++) {
      const filePath = join(tempDir, `scene_${i}.mp4`);
      const buffer = Buffer.from(sceneVideos[i].video.data, "base64");
      await writeFile(filePath, buffer);
      tempFiles.push(filePath);
    }

    // Create the ffmpeg concat demuxer list
    const concatFilePath = join(tempDir, "concat.txt");
    const concatContent = tempFiles.map((f) => `file '${f}'`).join("\n");
    await writeFile(concatFilePath, concatContent);

    // Run ffmpeg to concatenate (no re-encoding — all scenes share codec/resolution)
    const outputPath = join(tempDir, "stitched.mp4");
    await execFileAsync(ffmpegPath!, [
      "-f", "concat",
      "-safe", "0",
      "-i", concatFilePath,
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ]);

    const stitchedBuffer = await readFile(outputPath);
    return { data: stitchedBuffer.toString("base64"), mimeType: "video/mp4" };
  } finally {
    // Clean up temp files
    const allFiles = [
      ...tempFiles,
      join(tempDir, "concat.txt"),
      join(tempDir, "stitched.mp4"),
    ];
    await Promise.allSettled(allFiles.map((f) => unlink(f).catch(() => {})));
    await rmdir(tempDir).catch(() => {});
  }
}

export async function POST(req: Request) {
  try {
    const { scenes, artisticStyle, aspectRatio, sceneDuration } =
      (await req.json()) as {
        scenes: SceneInput[];
        artisticStyle?: string;
        aspectRatio?: string;
        sceneDuration?: number;
      };

    if (!scenes || scenes.length === 0) {
      return Response.json(
        { error: "No scenes provided" },
        { status: 400 }
      );
    }

    const durationNum = sceneDuration || 5;
    const duration = String(durationNum <= 4 ? 4 : durationNum <= 8 ? 8 : 12) as VideoSeconds;
    const ar = cleanAspectRatio(aspectRatio || "16:9");
    const size = aspectRatioToSize(ar);

    // Generate all scene videos in parallel to stay within maxDuration
    const sceneVideos = await Promise.all(
      scenes.map((scene) =>
        generateSceneVideo(scene, artisticStyle || "", size, duration)
      )
    );

    // Stitch all scene videos into one final video
    const stitchedVideo = await stitchVideos(sceneVideos);

    return Response.json({
      stitchedVideo,
      sceneDuration: Number(duration),
      sceneVideos: sceneVideos.map((sv) => ({ title: sv.title })),
    });
  } catch (error) {
    console.error("Video generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate video";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
