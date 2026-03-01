import { create } from "zustand";
import { useProjectStore } from "./use-project-store";
import { usePlaybackStore } from "./use-playback-store";
import { useTimelineStore, type Track } from "./use-timeline-store";

export interface ChatImage {
  data: string; // base64
  mimeType: string;
  label?: string;
}

export interface ChatVideo {
  data: string; // base64
  mimeType: string;
}

export interface CharacterGroup {
  name: string;
  images: ChatImage[];
}

export interface SceneImage {
  title: string;
  image: ChatImage;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  images?: ChatImage[];
  characterGroups?: CharacterGroup[];
  sceneImages?: SceneImage[];
  video?: ChatVideo;
}

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:mime;base64, prefix
      const base64 = result.split(",")[1];
      resolve({ data: base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Parse scenes from the Script section of the project overview */
function parseScenesFromOverview(overview: string) {
  const scriptMatch = overview.match(/## Script\n([\s\S]*?)(?=\n## |$)/);
  const scriptText = scriptMatch?.[1]?.trim() || "";
  const sceneRegex = /\*\*(.+?)\*\*.*?(?:\u2014|--|-)\s*(.*?)(?=\n- \*\*|$)/g;
  const scenes: { title: string; description: string }[] = [];
  let match;
  while ((match = sceneRegex.exec(scriptText)) !== null) {
    scenes.push({ title: match[1].trim(), description: match[2].trim() });
  }
  return scenes;
}

/** Parse dialogue from the Dialogue section of the project overview */
function parseDialogueFromOverview(overview: string) {
  const dialogueMatch = overview.match(/## Dialogue\n([\s\S]*?)(?=\n## |$)/);
  const dialogueText = dialogueMatch?.[1]?.trim() || "";
  const dialogueRegex = /\*\*(.+?)\*\*.*?(?:\u2014|--|-)\s*(.*?)(?=\n- \*\*|$)/g;
  const dialogues: { title: string; dialogue: string }[] = [];
  let match;
  while ((match = dialogueRegex.exec(dialogueText)) !== null) {
    const dialogue = match[2].trim();
    if (dialogue && !dialogue.includes("No dialogue")) {
      dialogues.push({ title: match[1].trim(), dialogue });
    }
  }
  return dialogues;
}

/** Build chat history with context annotations for generated images */
function buildHistory(messages: ChatMessage[]) {
  return messages.map((m) => {
    let content = m.content;
    if (m.video) {
      content += "\n\n[Final video was generated and displayed successfully]";
    } else if (m.sceneImages) {
      content += "\n\n[Scene images were generated successfully for: " +
        m.sceneImages.map((s) => s.title).join(", ") + "]";
    } else if (m.characterGroups) {
      content += "\n\n[Character sheets were generated successfully for: " +
        m.characterGroups.map((c) => c.name).join(", ") + "]";
    }
    return { role: m.role, content };
  });
}

/** All hidden markers that trigger pipeline steps */
const HIDDEN_MARKERS = [
  "<!--GENERATE_SCENES-->",
  "<!--GENERATE_SCENE_THUMBNAILS-->",
  "<!--GENERATE_VIDEO-->",
];

/** Strip all hidden markers and AI-parroted context annotations from displayed text */
function stripMarkers(text: string): string {
  let result = text;
  for (const marker of HIDDEN_MARKERS) {
    result = result.replaceAll(marker, "");
  }
  // Strip context annotations that buildHistory adds and the AI parrots back
  result = result.replace(/\[Scene images were generated successfully for:[^\]]*\]/g, "");
  result = result.replace(/\[Character sheets were generated successfully for:[^\]]*\]/g, "");
  result = result.replace(/\[Final video was generated and displayed successfully\]/g, "");
  return result.trimEnd();
}

/** Stream a chat API response into the last assistant message, parse PROJECT_MD */
async function streamChatResponse(
  addMessage: ChatState["addMessage"],
  updateLastMessage: ChatState["updateLastMessage"],
  messages: ChatMessage[]
) {
  const history = buildHistory(messages);
  const chatRes = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });

  if (!chatRes.ok) return "";

  addMessage("assistant", "");
  const reader = chatRes.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    updateLastMessage(stripMarkers(accumulated));
  }

  const projectMatch = accumulated.match(/<!--PROJECT_MD:([^]*?)-->/);
  if (projectMatch) {
    useProjectStore.getState().setOverview(projectMatch[1].trim());
    accumulated = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
  }

  accumulated = stripMarkers(accumulated);
  updateLastMessage(accumulated);

  return accumulated;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentStep: number;
  initialized: boolean;
  addMessage: (
    role: "user" | "assistant",
    content: string,
    extra?: Partial<Pick<ChatMessage, "images" | "characterGroups" | "sceneImages" | "video">>
  ) => void;
  updateLastMessage: (
    content: string,
    extra?: Partial<Pick<ChatMessage, "characterGroups" | "sceneImages" | "video">>
  ) => void;
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithImages: (content: string, files: File[]) => Promise<void>;
  generateSceneLocations: () => Promise<void>;
  generateSceneWithCharacters: () => Promise<void>;
  generateFinalVideo: () => Promise<void>;
  initializeWithPrompt: (prompt: string) => void;
  setCurrentStep: (step: number) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  currentStep: 1,
  initialized: false,

  addMessage: (role, content, extra) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: Date.now(),
          ...extra,
        },
      ],
    })),

  updateLastMessage: (content, extra) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, ...extra };
      }
      return { messages: msgs };
    }),

  sendMessage: async (content) => {
    const { addMessage, updateLastMessage } = get();

    // Add user message
    addMessage("user", content);
    // Add empty assistant placeholder
    addMessage("assistant", "");
    set({ isLoading: true });

    try {
      // Build history from all messages except the empty placeholder
      const history = buildHistory(get().messages.slice(0, -1));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        updateLastMessage(stripMarkers(accumulated));
      }

      // Parse hidden PROJECT_MD block from assistant response
      const projectMatch = accumulated.match(
        /<!--PROJECT_MD:([^]*?)-->/
      );
      if (projectMatch) {
        useProjectStore.getState().setOverview(projectMatch[1].trim());
        accumulated = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
      }

      // Check for pipeline triggers before stripping markers
      const hasScenesTrigger = accumulated.includes("<!--GENERATE_SCENES-->");
      const hasThumbnailsTrigger = accumulated.includes("<!--GENERATE_SCENE_THUMBNAILS-->");
      const hasVideoTrigger = accumulated.includes("<!--GENERATE_VIDEO-->");

      // Strip all markers from displayed text
      accumulated = stripMarkers(accumulated);
      updateLastMessage(accumulated);

      // Trigger pipeline steps
      if (hasScenesTrigger) {
        set({ isLoading: false });
        await get().generateSceneLocations();
        return;
      }

      if (hasThumbnailsTrigger) {
        set({ isLoading: false });
        await get().generateSceneWithCharacters();
        return;
      }

      if (hasVideoTrigger) {
        set({ isLoading: false });
        await get().generateFinalVideo();
        return;
      }

      // Fallback: detect pipeline transitions from the AI's response text
      // when the AI forgets to include hidden markers
      if (!hasScenesTrigger && !hasThumbnailsTrigger && !hasVideoTrigger) {
        const overview = useProjectStore.getState().overview || "";
        const lower = accumulated.toLowerCase();

        // Dialogue was just resolved → should generate scene locations
        const hasScript = overview.includes("## Script");
        const dialogueResolved =
          lower.includes("locking in your dialogue") ||
          lower.includes("keeping it purely visual") ||
          lower.includes("locked in your dialogue") ||
          lower.includes("dialogue is locked");
        if (hasScript && dialogueResolved) {
          set({ isLoading: false });
          await get().generateSceneLocations();
          return;
        }
      }
    } catch {
      updateLastMessage("Sorry, something went wrong. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessageWithImages: async (content, files) => {
    const { addMessage, updateLastMessage } = get();

    // Convert files to base64
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const images = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mimeType } = await fileToBase64(f);
        return { data, mimeType, label: f.name } as ChatImage;
      })
    );

    // Add user message with images
    const userContent = content || `Uploaded ${images.length} reference photo${images.length > 1 ? "s" : ""}`;
    addMessage("user", userContent, { images });

    // Add empty assistant placeholder
    addMessage("assistant", "");
    set({ isLoading: true });

    // Extract artistic style from project overview if available
    const overview = useProjectStore.getState().overview || "";
    const styleMatch = overview.match(/## Artistic Style\n([^\n#]+)/);
    const artisticStyle = styleMatch?.[1]?.trim() || "";

    const fetchSingleCharacter = async (img: ChatImage): Promise<CharacterGroup | null> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/generate-characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: [{ data: img.data, mimeType: img.mimeType, name: img.label }],
              message: content,
              artisticStyle,
            }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`API error ${res.status}: ${body}`);
          }
          const { characters } = (await res.json()) as { characters: CharacterGroup[] };
          return characters[0] ?? null;
        } catch (err) {
          if (attempt === 1) {
            console.warn(`Failed to generate character for "${img.label}":`, err);
            return null;
          }
        }
      }
      return null;
    };

    try {
      updateLastMessage("Generating character sheets...", { characterGroups: [] });

      // Fire off all character generations in parallel, update UI as each completes
      const completed: CharacterGroup[] = [];

      await Promise.all(
        images.map(async (img) => {
          const character = await fetchSingleCharacter(img);
          if (character) {
            completed.push(character);
            get().updateLastMessage(
              `Generating character sheets (${completed.length}/${images.length})...`,
              { characterGroups: [...completed] }
            );
          }
        })
      );

      if (completed.length === 0) {
        throw new Error("All character generations failed");
      }

      // Set final message
      updateLastMessage("Here are your character sheets!", { characterGroups: completed });

      // Send a follow-up to the chat API so the agent can acknowledge and move on
      await streamChatResponse(addMessage, updateLastMessage, get().messages);
    } catch {
      updateLastMessage("Sorry, something went wrong generating character sheets. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },

  // Phase 1: Generate location/background images only (no characters)
  generateSceneLocations: async () => {
    const { addMessage, updateLastMessage } = get();

    const overview = useProjectStore.getState().overview || "";
    const styleMatch = overview.match(/## Artistic Style\n([^\n#]+)/);
    const artisticStyle = styleMatch?.[1]?.trim() || "";

    const arMatch = overview.match(/## Aspect Ratio\n([^\n#]+)/);
    const aspectRatio = arMatch?.[1]?.trim() || "16:9";

    const scenes = parseScenesFromOverview(overview);
    if (scenes.length === 0) return;

    addMessage("assistant", "");
    set({ isLoading: true });

    const attemptGeneration = async () => {
      const res = await fetch("/api/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, artisticStyle, aspectRatio }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const { scenes: results } = (await res.json()) as {
        scenes: { title: string; image: { data: string; mimeType: string } | null }[];
      };
      return results;
    };

    try {
      updateLastMessage("Generating scene locations...");

      let results: { title: string; image: { data: string; mimeType: string } | null }[] | null = null;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          results = await attemptGeneration();
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            updateLastMessage("First attempt didn't work, retrying scene location generation...");
          }
        }
      }

      if (!results) {
        throw lastError ?? new Error("Scene location generation failed");
      }

      const sceneImages: SceneImage[] = results
        .filter((r) => r.image !== null)
        .map((r) => ({
          title: r.title,
          image: { data: r.image!.data, mimeType: r.image!.mimeType },
        }));

      // Set sceneImages on placeholder with a label
      updateLastMessage("Here are your scene locations!", { sceneImages });

      await streamChatResponse(addMessage, updateLastMessage, get().messages);
    } catch {
      updateLastMessage("Sorry, something went wrong generating scene locations. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },

  // Phase 2: Generate full scene thumbnails with characters placed into locations
  generateSceneWithCharacters: async () => {
    const { addMessage, updateLastMessage } = get();

    const overview = useProjectStore.getState().overview || "";
    const styleMatch = overview.match(/## Artistic Style\n([^\n#]+)/);
    const artisticStyle = styleMatch?.[1]?.trim() || "";

    const charactersMatch = overview.match(/## Characters\n([\s\S]*?)(?=\n## |$)/);
    const characters = charactersMatch?.[1]?.trim() || "";

    const arMatch = overview.match(/## Aspect Ratio\n([^\n#]+)/);
    const aspectRatio = arMatch?.[1]?.trim() || "16:9";

    const scenes = parseScenesFromOverview(overview);
    if (scenes.length === 0) return;

    // Collect location images from previous messages
    const msgs = get().messages;
    const locationImages: { title: string; image: { data: string; mimeType: string } }[] = [];
    for (const m of msgs) {
      if (m.sceneImages) {
        for (const si of m.sceneImages) {
          locationImages.push({
            title: si.title,
            image: { data: si.image.data, mimeType: si.image.mimeType },
          });
        }
      }
    }

    // Collect character front-view images from previous messages
    const characterImages: { name: string; image: { data: string; mimeType: string } }[] = [];
    for (const m of msgs) {
      if (m.characterGroups) {
        for (const group of m.characterGroups) {
          // Use the first image (front view) as the reference
          const frontView = group.images[0];
          if (frontView) {
            characterImages.push({
              name: group.name,
              image: { data: frontView.data, mimeType: frontView.mimeType },
            });
          }
        }
      }
    }

    addMessage("assistant", "");
    set({ isLoading: true });

    const attemptGeneration = async () => {
      const res = await fetch("/api/generate-scene-thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes,
          artisticStyle,
          characters,
          characterImages,
          locationImages,
          aspectRatio,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const { scenes: results } = (await res.json()) as {
        scenes: { title: string; image: { data: string; mimeType: string } | null }[];
      };
      return results;
    };

    try {
      updateLastMessage("Generating scene thumbnails with characters...");

      let results: { title: string; image: { data: string; mimeType: string } | null }[] | null = null;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          results = await attemptGeneration();
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            updateLastMessage("First attempt didn't work, retrying scene thumbnail generation...");
          }
        }
      }

      if (!results) {
        throw lastError ?? new Error("Scene thumbnail generation failed");
      }

      const sceneImages: SceneImage[] = results
        .filter((r) => r.image !== null)
        .map((r) => ({
          title: r.title,
          image: { data: r.image!.data, mimeType: r.image!.mimeType },
        }));

      // Set sceneImages on placeholder with a label
      updateLastMessage("Here are your scene thumbnails with characters!", { sceneImages });

      await streamChatResponse(addMessage, updateLastMessage, get().messages);
    } catch {
      updateLastMessage("Sorry, something went wrong generating scene thumbnails. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 6: Generate final video using Veo 3.1
  generateFinalVideo: async () => {
    const { addMessage, updateLastMessage } = get();

    const overview = useProjectStore.getState().overview || "";
    const styleMatch = overview.match(/## Artistic Style\n([^\n#]+)/);
    const artisticStyle = styleMatch?.[1]?.trim() || "";

    const arMatch = overview.match(/## Aspect Ratio\n([^\n#]+)/);
    const aspectRatio = arMatch?.[1]?.trim() || "16:9";

    const scenes = parseScenesFromOverview(overview);
    if (scenes.length === 0) return;

    const dialogues = parseDialogueFromOverview(overview);

    // Collect the latest scene thumbnail images from chat messages
    const msgs = get().messages;
    let latestSceneImages: SceneImage[] = [];
    for (const m of msgs) {
      if (m.sceneImages && m.sceneImages.length > 0) {
        latestSceneImages = m.sceneImages;
      }
    }

    if (latestSceneImages.length === 0) return;

    // Build scene payloads by matching scenes with their thumbnails and dialogue
    const scenePayloads = scenes.map((scene) => {
      const matchingImage = latestSceneImages.find(
        (si) => si.title === scene.title
      ) || latestSceneImages[scenes.indexOf(scene)];

      const matchingDialogue = dialogues.find(
        (d) => d.title === scene.title
      );

      return {
        title: scene.title,
        description: scene.description,
        dialogue: matchingDialogue?.dialogue,
        image: matchingImage
          ? { data: matchingImage.image.data, mimeType: matchingImage.image.mimeType }
          : { data: "", mimeType: "image/png" },
      };
    }).filter((s) => s.image.data);

    addMessage("assistant", "");
    set({ isLoading: true });

    try {
      updateLastMessage("Generating final video... This may take a few minutes.");

      // Abort if the server doesn't respond within 5 minutes
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      let result: {
        stitchedVideo: { data: string; mimeType: string };
        sceneDuration: number;
        sceneVideos: { title: string }[];
      };
      try {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: scenePayloads,
            artisticStyle,
            aspectRatio,
            sceneDuration: 5,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`API error ${res.status}: ${body}`);
        }

        result = await res.json();
      } finally {
        clearTimeout(fetchTimeout);
      }

      // Use the stitched video for the chat preview and player
      const video: ChatVideo = {
        data: result.stitchedVideo.data,
        mimeType: result.stitchedVideo.mimeType,
      };
      updateLastMessage("Here's your final video!", { video });

      // Create blob URL and update playback store
      const byteArray = Uint8Array.from(atob(result.stitchedVideo.data), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: result.stitchedVideo.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      usePlaybackStore.getState().setVideoSrc(blobUrl);

      // Populate the timeline with scene clips using actual duration from API
      const actualSceneDuration = result.sceneDuration;
      const videoClips = result.sceneVideos.map((sv, i) => ({
        id: `clip-v-${i}`,
        sourceId: `scene-${i}`,
        start: i * actualSceneDuration,
        duration: actualSceneDuration,
        originalStart: i * actualSceneDuration,
        originalDuration: actualSceneDuration,
        label: sv.title,
      }));

      const audioClips = result.sceneVideos.map((sv, i) => ({
        id: `clip-a-${i}`,
        sourceId: `scene-${i}`,
        start: i * actualSceneDuration,
        duration: actualSceneDuration,
        originalStart: i * actualSceneDuration,
        originalDuration: actualSceneDuration,
        label: `${sv.title} Audio`,
      }));

      const tracks: Track[] = [
        { id: "video-1", type: "video", label: "Video", clips: videoClips },
        { id: "audio-1", type: "audio", label: "Audio", clips: audioClips },
      ];
      useTimelineStore.getState().setTracks(tracks);

      // Stream follow-up response from the agent
      await streamChatResponse(addMessage, updateLastMessage, get().messages);
    } catch (err) {
      console.error("Video generation failed:", err);
      const detail = err instanceof Error ? err.message : "";
      updateLastMessage(
        `Sorry, something went wrong generating the video. Please try again.${detail ? `\n\nError: ${detail}` : ""}`
      );
    } finally {
      set({ isLoading: false });
    }
  },

  initializeWithPrompt: (prompt) => {
    const { initialized, sendMessage } = get();
    if (initialized) return;
    set({ initialized: true });
    sendMessage(prompt);
  },

  setCurrentStep: (step) => set({ currentStep: step }),
}));
