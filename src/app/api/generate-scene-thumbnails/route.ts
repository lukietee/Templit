import { ai, GEMINI_IMAGE_MODEL } from "@/backend/gemini";

export const maxDuration = 120;

interface SceneInput {
  title: string;
  description: string;
}

interface ImageData {
  data: string; // base64
  mimeType: string;
}

interface CharacterInput {
  name: string;
  image: ImageData;
}

interface LocationInput {
  title: string;
  image: ImageData;
}

interface SceneOutput {
  title: string;
  image: { data: string; mimeType: string } | null;
}

const MAX_RETRIES = 3;

function toGeminiAspectRatio(ar: string): string {
  const cleaned = ar.replace(/[()]/g, "").trim().toLowerCase();
  if (cleaned.includes("9:16")) return "9:16";
  if (cleaned.includes("1:1")) return "1:1";
  if (cleaned.includes("4:3")) return "4:3";
  if (cleaned.includes("3:4")) return "3:4";
  return "16:9";
}

async function generateSceneThumbnail(
  scene: SceneInput,
  artisticStyle: string,
  characters: string,
  characterImages: CharacterInput[],
  locationImage: LocationInput | undefined,
  aspectRatio: string
): Promise<SceneOutput> {
  const geminiAR = toGeminiAspectRatio(aspectRatio);

  // Build parts array with labeled reference images
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  // Label and add location image
  if (locationImage?.image) {
    parts.push({ text: "LOCATION/BACKGROUND IMAGE for this scene:" });
    parts.push({
      inlineData: {
        data: locationImage.image.data,
        mimeType: locationImage.image.mimeType,
      },
    });
  }

  // Label and add each character image individually
  for (const char of characterImages) {
    parts.push({ text: `CHARACTER REFERENCE IMAGE for "${char.name}":` });
    parts.push({
      inlineData: {
        data: char.image.data,
        mimeType: char.image.mimeType,
      },
    });
  }

  // Build character list for prompt
  const charList = characterImages.length > 0
    ? characterImages.map((c) => `- "${c.name}" — use their reference image above as the EXACT visual guide`).join("\n")
    : "";

  // Add the text prompt
  parts.push({
    text: `You are a cinematic scene compositor. Using the location background and character reference images provided above, generate a single scene image.

CRITICAL: The characters in the output MUST look exactly like their reference images above. Copy their exact appearance — face, hair, clothing, colors, proportions. Do NOT invent new character designs. The reference images are the ground truth for what each character looks like.

Scene: ${scene.title}
Description: ${scene.description}

Artistic Style: ${artisticStyle}

Characters in this scene:
${characters}
${charList ? `\nCharacter visual references to match:\n${charList}` : ""}

Requirements:
- Use the LOCATION image as the background/setting
- Draw each character to match their reference image EXACTLY — same face, hair, outfit, colors
- Characters should be naturally placed in the scene with correct scale and perspective
- Follow the artistic style
- Do NOT add any text, labels, captions, watermarks, or annotations
- The final image should look like a frame from the actual video`,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: [{ role: "user", parts }],
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
    const { scenes, artisticStyle, characters, characterImages, locationImages, aspectRatio } =
      (await req.json()) as {
        scenes: SceneInput[];
        artisticStyle?: string;
        characters?: string;
        characterImages?: CharacterInput[];
        locationImages?: LocationInput[];
        aspectRatio?: string;
      };

    if (!scenes || scenes.length === 0) {
      return Response.json(
        { error: "No scenes provided" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      scenes.map((scene) => {
        // Find the matching location image for this scene
        const location = locationImages?.find((l) => l.title === scene.title);
        return generateSceneThumbnail(
          scene,
          artisticStyle || "",
          characters || "",
          characterImages || [],
          location,
          aspectRatio || "16:9"
        );
      })
    );

    return Response.json({ scenes: results });
  } catch (error) {
    console.error("Scene thumbnail generation error:", error);
    return Response.json(
      { error: "Failed to generate scene thumbnails" },
      { status: 500 }
    );
  }
}
