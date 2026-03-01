import { ai, GEMINI_IMAGE_MODEL } from "@/backend/gemini";

export const maxDuration = 120;

interface UploadedImage {
  data: string; // base64
  mimeType: string;
  name?: string;
}

interface CharacterView {
  data: string;
  mimeType: string;
  label: string;
}

interface CharacterGroup {
  name: string;
  images: CharacterView[];
}

const VIEWS = ["front", "back", "right side", "left side"] as const;

const VIEW_DESCRIPTIONS: Record<string, string> = {
  front: "facing directly toward the camera, showing their face and the front of their body",
  back: "facing directly away from the camera, showing the back of their head and body. Their face should NOT be visible",
  "right side": "turned 90 degrees so the camera sees their right profile. Only the right side of their face and body should be visible",
  "left side": "turned 90 degrees so the camera sees their left profile. Only the left side of their face and body should be visible",
};
const MAX_RETRIES = 3;

const CARTOON_KEYWORDS = [
  "cartoon", "anime", "animated", "animation", "pixar", "disney",
  "cel-shaded", "cel shaded", "2d", "stylized", "illustration",
  "comic", "manga", "chibi", "toon",
];

function isCartoonStyle(style: string): boolean {
  const lower = style.toLowerCase();
  return CARTOON_KEYWORDS.some((kw) => lower.includes(kw));
}

async function generateSingleView(
  image: UploadedImage,
  view: string,
  name: string,
  artisticStyle: string
): Promise<CharacterView | null> {
  const styleInstruction = isCartoonStyle(artisticStyle)
    ? `Use the following artistic style: ${artisticStyle}`
    : `IMPORTANT: Generate PHOTOREALISTIC images that look like real photographs. Do NOT use cartoon, illustrated, or stylized rendering. The output must look like actual photos of a real person.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: image.data,
                  mimeType: image.mimeType,
                },
              },
              {
                text: `You are a character design assistant. Given this reference photo of a person/character, generate a single image showing the character from the ${view} view.

THE CAMERA ANGLE IS CRITICAL: The character must be ${VIEW_DESCRIPTIONS[view]}. This is a ${view} view — get the angle exactly right.

${styleInstruction}

Requirements:
- The image should show the FULL character on a plain WHITE background with NO other elements
- Do NOT add any text, labels, captions, watermarks, or annotations onto the image. The image must contain ONLY the character on white — absolutely no words or letters
- Maintain the character's appearance (clothing, hair, proportions) exactly as in the reference
- The character should be standing in a neutral pose
- The image must match the person's real appearance as closely as possible
- Generate exactly ONE image showing ONLY the ${view} view`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData
      );
      if (part?.inlineData) {
        return {
          data: part.inlineData.data!,
          mimeType: part.inlineData.mimeType!,
          label: view,
        };
      }

      console.warn(
        `Attempt ${attempt}/${MAX_RETRIES} for "${name}" (${view}) returned no image, retrying...`
      );
    } catch (err) {
      console.warn(
        `Attempt ${attempt}/${MAX_RETRIES} for "${name}" (${view}) failed:`,
        err
      );
      if (attempt === MAX_RETRIES) return null;
    }
  }

  return null;
}

async function generateCharacterViews(
  image: UploadedImage,
  index: number,
  artisticStyle: string
): Promise<CharacterGroup> {
  const name = image.name?.replace(/\.[^.]+$/, "") || `Character ${index + 1}`;

  const results = await Promise.allSettled(
    VIEWS.map((view) => generateSingleView(image, view, name, artisticStyle))
  );

  const images = results
    .filter(
      (r): r is PromiseFulfilledResult<CharacterView> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  return { name, images };
}

export async function POST(req: Request) {
  try {
    const { images, artisticStyle } = (await req.json()) as {
      images: UploadedImage[];
      message?: string;
      artisticStyle?: string;
    };

    if (!images || images.length === 0) {
      return Response.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const characters = await Promise.all(
      images.map((img, i) => generateCharacterViews(img, i, artisticStyle || ""))
    );

    return Response.json({ characters });
  } catch (error) {
    console.error("Character generation error:", error);
    return Response.json(
      { error: "Failed to generate character views" },
      { status: 500 }
    );
  }
}
