# Templit: Cursor for Video Editing

## Project Overview

Templit is an AI-powered video editing platform that combines a conversational agent interface with a full video editor — essentially Cursor/Lovable but for video creation. Users interact with an AI agent through a chat interface to generate, iterate on, and refine AI-generated videos from start to finish.

---

## UI / Layout

### Screen 1: Landing Page (Prompt Screen)

- Clean landing page with a centered prompt box (similar to Claude AI's chat input)
- User can type a prompt describing their video idea
- Upload button allows the user to attach assets (images, audio, reference files)
- Upon clicking upload/submit, all user-provided assets and prompt text are passed to the Editing Screen

### Screen 2: Editing Screen

The editing screen is split into two panels:

| Section | Width | Description |
|---|---|---|
| Chat Interface | 25% (left) | Conversational AI agent panel for interacting with the video creation pipeline |
| Video Editor | 75% (right) | Timeline-based video editor with playback, tracks, and preview |

#### Chat Interface (Left — 25%)

- Persistent chat window for communicating with the AI agent
- The agent guides the user through each stage of the video creation pipeline (see Agent Workflow below)
- Users can approve, reject, regenerate, or edit outputs at each step
- Chat history is preserved throughout the session

#### Video Editor (Right — 75%)

- **Video Preview Area**: Displays the current video/scene preview at the top of the editor panel
- **Playback Controls**: Play, pause, scrub through timeline
- **Playback Head**: Long red vertical bar that the user can drag to scrub through the timeline
- **Timeline**: Horizontal timeline at the bottom of the editor with multiple tracks:
  - Video track(s)
  - Audio track(s)
  - Text/subtitle track (if applicable)
- **Track Management**: Users can view and manage separate tracks for layered audio, video clips, and overlays
- Scenes are stitched together on the timeline for full preview

---

## Agent Workflow

The AI agent in the chat interface guides the user through the following sequential pipeline. At each step, the user can approve, edit, or request regeneration before proceeding.

### Step 1: Project Overview

The agent asks the user to define the high-level parameters of the video:

1. **Purpose / Topic** — What is the video about?
2. **Duration** — How long should the video be?
3. **Aspect Ratio** — 16:9 (landscape) or 9:16 (portrait/vertical)?

### Step 2: Artistic Style

The agent presents style options for the video's visual tone:

1. 3D Animation
2. Cinematic
3. Casual
4. Comedic

The user selects one (or describes a custom style).

### Step 3: Character Generation

1. The user uploads reference pictures of characters
2. **Google Nano Banana** generates 4 reference images per character (front, back, left, right views)
3. The generated reference images are displayed in the chat for user review
4. The user can regenerate any character reference images before approving and moving to the next step

### Step 4: Script and Scenes

1. **Gemini 3** generates a text-based storyboard broken into multiple scenes
2. The script may or may not include dialogue depending on the project
3. The storyboard is presented in the chat interface for the user to review
4. The user can edit the script directly before approving and moving to the next step

### Step 5: Scene Thumbnails

1. **Google Nano Banana** generates thumbnail images for each scene described in the storyboard
2. Upon approval of scene compositions, Google Nano Banana generates images of the characters placed within each scene
3. All generated scene images are shown to the user for review
4. The user can regenerate any scene thumbnails before approving and moving to the next step

### Step 6: Final Video Generation

1. **Gemini 3** completes the initial video creation plan and the iterative approval loop ends
2. **Veo 3.1** generates scene videos using frame-to-frame fill based on the approved scene thumbnails
3. The agent stitches together 8-second scene clips and places them on the timeline
4. The user can preview the full video in the editor and request adjustments

---

## Tech Stack / Models

| Component | Technology |
|---|---|
| Image Generation (characters & scenes) | Google Nano Banana |
| Script / Storyboard Generation | Gemini 3 |
| Video Generation (frame-to-frame fill) | Veo 3.1 |
| Chat Agent Orchestration | Gemini 3 |

---

## Key Features Summary

- Conversational AI-driven video creation pipeline
- Step-by-step guided workflow with user approval gates at each stage
- AI-generated characters with multi-angle reference sheets
- AI-generated storyboards and scene thumbnails
- Video generation from approved scene images using Veo 3.1
- Timeline-based editor with multi-track support (video, audio)
- Playback with red scrubber playback head
- 8-second scene stitching with full preview capability