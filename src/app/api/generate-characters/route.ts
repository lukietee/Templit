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

async function generateCharacterViews(
  image: UploadedImage,
  index: number
): Promise<CharacterGroup> {
  const name = image.name?.replace(/\.[^.]+$/, "") || `Character ${index + 1}`;

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
            text: `You are a character design assistant. Given this reference photo of a person/character, generate 4 separate images showing the character from these exact angles: front view, back view, right side view, and left side view.

Requirements:
- Each image should show the FULL character on a plain WHITE background
- Maintain consistent appearance (clothing, hair, proportions) across all views
- The character should be standing in a neutral pose
- Generate all 4 views as separate images in order: front, back, right side, left side`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "1:1" },
    },
  });

  const images: CharacterView[] = [];
  let viewIndex = 0;

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && viewIndex < VIEWS.length) {
        images.push({
          data: part.inlineData.data!,
          mimeType: part.inlineData.mimeType!,
          label: VIEWS[viewIndex],
        });
        viewIndex++;
      }
    }
  }

  return { name, images };
}

export async function POST(req: Request) {
  try {
    const { images } = (await req.json()) as {
      images: UploadedImage[];
      message?: string;
    };

    if (!images || images.length === 0) {
      return Response.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const characters = await Promise.all(
      images.map((img, i) => generateCharacterViews(img, i))
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
