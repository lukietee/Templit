import { ai, GEMINI_IMAGE_MODEL } from "@/backend/gemini";

export const maxDuration = 120;

interface SceneInput {
  title: string;
  description: string;
}

interface SceneOutput {
  title: string;
  image: { data: string; mimeType: string } | null;
}

const MAX_RETRIES = 3;

// Map common aspect ratio strings to Gemini-supported values
function toGeminiAspectRatio(ar: string): string {
  const cleaned = ar.replace(/[()]/g, "").trim().toLowerCase();
  if (cleaned.includes("9:16")) return "9:16";
  if (cleaned.includes("1:1")) return "1:1";
  if (cleaned.includes("4:3")) return "4:3";
  if (cleaned.includes("3:4")) return "3:4";
  return "16:9"; // default landscape
}

async function generateLocationImage(
  scene: SceneInput,
  artisticStyle: string,
  aspectRatio: string
): Promise<SceneOutput> {
  const geminiAR = toGeminiAspectRatio(aspectRatio);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a cinematic location/environment artist. Generate a single image depicting ONLY the location and environment for the following scene from a video storyboard.

Scene: ${scene.title}
Description: ${scene.description}

Artistic Style: ${artisticStyle}

Requirements:
- Generate ONLY the location, environment, and background — do NOT include any people, characters, or human figures in the image
- The scene should be an empty location ready for characters to be placed in later
- Capture the mood, lighting, time of day, and atmosphere described in the scene
- Follow the artistic style exactly
- Do NOT add any text, labels, captions, watermarks, or annotations onto the image
- Focus on cinematic composition, lighting, and atmosphere
- The image should look like an establishing shot or background plate from the actual video`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: geminiAR },
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return {
              title: scene.title,
              image: {
                data: part.inlineData.data!,
                mimeType: part.inlineData.mimeType!,
              },
            };
          }
        }
      }

      console.warn(
        `Attempt ${attempt}/${MAX_RETRIES} for "${scene.title}" returned no image, retrying...`
      );
    } catch (err) {
      console.warn(
        `Attempt ${attempt}/${MAX_RETRIES} for "${scene.title}" failed:`,
        err
      );
      if (attempt === MAX_RETRIES) throw err;
    }
  }

  return { title: scene.title, image: null };
}

export async function POST(req: Request) {
  try {
    const { scenes, artisticStyle, aspectRatio } =
      (await req.json()) as {
        scenes: SceneInput[];
        artisticStyle?: string;
        aspectRatio?: string;
      };

    if (!scenes || scenes.length === 0) {
      return Response.json(
        { error: "No scenes provided" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      scenes.map((scene) =>
        generateLocationImage(
          scene,
          artisticStyle || "",
          aspectRatio || "16:9"
        )
      )
    );

    return Response.json({ scenes: results });
  } catch (error) {
    console.error("Scene location generation error:", error);
    return Response.json(
      { error: "Failed to generate scene locations" },
      { status: 500 }
    );
  }
}
