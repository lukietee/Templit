# Templit

Templit is an agentic video editing platform — think Cursor, but for video. An AI agent guides you through the entire video creation process in a conversational chat interface, from initial concept to a fully produced, stitched-together video.

https://github.com/user-attachments/assets/32a197f9-4b06-4229-b1ad-75beaa78ae4d

HD Demo: https://youtu.be/8RdLiv3fTVU

## How It Works

Templit has two screens: a **landing page** where you enter your video idea, and the **editor** where the agent takes over.

The editor is a three-panel layout:

- **Chat panel** (left) — The AI agent lives here. It walks you through each step of the pipeline, asks for your input, and kicks off generation tasks behind the scenes.
- **Preview panel** (top right) — Watch your video with full playback controls once it's generated.
- **Timeline panel** (bottom right) — A multi-track timeline showing your video and audio clips, with a draggable playhead and zoom controls.

### The Agent Pipeline

The agent walks you through six steps, each with an approval gate where you can review, request changes, or approve before moving on:

1. **Project Overview** — The agent collects your video's topic, duration, and aspect ratio.
2. **Artistic Style** — The agent suggests four tailored visual styles based on your concept. Pick one or describe your own.
3. **Character Generation** — Upload reference photos of your characters. The agent sends them to **Google Nano Banana 2** which generates a four-view character sheet (front, back, left, right) for each one.
4. **Script & Scenes** — The agent proposes four storyboard concepts, then generates a full scene-by-scene script with timestamps and dialogue. Scene count is calculated from your chosen duration (~5 seconds per scene).
5. **Scene Thumbnails** — Two phases:
   - *Scene Locations* — **Google Nano Banana 2** generates a background/environment image for each scene.
   - *Scene Thumbnails with Characters* — **Google Nano Banana 2** composites your characters into each location to create the final scene thumbnails.
6. **Final Video** — Each scene thumbnail is sent to **OpenAI Sora 2** (image-to-video) to generate a video clip. The clips are stitched together with **FFmpeg** into one continuous video and loaded into the preview player and timeline.

Throughout the entire pipeline, the agent maintains a **Project Overview** panel on the right side of the screen. This living document is automatically updated after every interaction — if you go back and change your artistic style, revise a scene, or edit dialogue, the agent silently updates the overview to reflect the current state of your project.

The agent is orchestrated by **Gemini 2.5 Flash** for all chat and reasoning, with the image and video generation models called through API routes as the pipeline progresses.

## Examples

Prompt: Make a video to help me teach my kid how to make a grilled cheese sandwich.

https://github.com/user-attachments/assets/ff4b7d09-5e4a-438c-9b88-4605ccafa33e

Prompt: Make a video to help me teach my kid how to make a hamburger.

https://github.com/user-attachments/assets/066e50f9-e132-4231-9f7f-903f8281a4e3

Prompt: Make a video about two friends learning how to make a grilled cheese sandwich.

https://github.com/user-attachments/assets/2e6be1b6-4087-4867-926e-b272be2693db

## Tech Stack

- **Next.js 16** with App Router and TypeScript
- **Tailwind CSS v4** with a dark theme
- **Zustand** for state management
- **Gemini 2.5 Flash** — agent chat and reasoning
- **Google Nano Banana 2** — character sheets, scene locations, and scene thumbnails (image generation)
- **OpenAI Sora 2** — scene-to-video generation
- **FFmpeg** — video stitching
- **react-resizable-panels** for the editor layout

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
