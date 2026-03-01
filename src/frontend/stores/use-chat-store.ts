import { create } from "zustand";
import { useProjectStore } from "./use-project-store";

export interface ChatImage {
  data: string; // base64
  mimeType: string;
  label?: string;
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

/** Build chat history with context annotations for generated images */
function buildHistory(messages: ChatMessage[]) {
  return messages.map((m) => {
    let content = m.content;
    if (m.sceneImages) {
      content += "\n\n[Scene images were generated successfully for: " +
        m.sceneImages.map((s) => s.title).join(", ") + "]";
    } else if (m.characterGroups) {
      content += "\n\n[Character sheets were generated successfully for: " +
        m.characterGroups.map((c) => c.name).join(", ") + "]";
    }
    return { role: m.role, content };
  });
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
    updateLastMessage(accumulated);
  }

  const projectMatch = accumulated.match(/<!--PROJECT_MD:([^]*?)-->/);
  if (projectMatch) {
    useProjectStore.getState().setOverview(projectMatch[1].trim());
    accumulated = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
    updateLastMessage(accumulated);
  }

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
    extra?: Partial<Pick<ChatMessage, "images" | "characterGroups" | "sceneImages">>
  ) => void;
  updateLastMessage: (
    content: string,
    extra?: Partial<Pick<ChatMessage, "characterGroups" | "sceneImages">>
  ) => void;
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithImages: (content: string, files: File[]) => Promise<void>;
  generateSceneLocations: () => Promise<void>;
  generateSceneWithCharacters: () => Promise<void>;
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
        updateLastMessage(accumulated);
      }

      // Parse hidden PROJECT_MD block from assistant response
      const projectMatch = accumulated.match(
        /<!--PROJECT_MD:([^]*?)-->/
      );
      if (projectMatch) {
        useProjectStore.getState().setOverview(projectMatch[1].trim());
        // Strip the block from the displayed message
        accumulated = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
        updateLastMessage(accumulated);
      }

      // Check for scene location generation trigger (Phase 1)
      if (accumulated.includes("<!--GENERATE_SCENES-->")) {
        const cleaned = accumulated.replace(/<!--GENERATE_SCENES-->/, "").trimEnd();
        updateLastMessage(cleaned);
        set({ isLoading: false });
        await get().generateSceneLocations();
        return;
      }

      // Check for scene thumbnail generation trigger (Phase 2)
      if (accumulated.includes("<!--GENERATE_SCENE_THUMBNAILS-->")) {
        const cleaned = accumulated.replace(/<!--GENERATE_SCENE_THUMBNAILS-->/, "").trimEnd();
        updateLastMessage(cleaned);
        set({ isLoading: false });
        await get().generateSceneWithCharacters();
        return;
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

    const attemptGeneration = async (): Promise<CharacterGroup[]> => {
      const res = await fetch("/api/generate-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({
            data: img.data,
            mimeType: img.mimeType,
            name: img.label,
          })),
          message: content,
          artisticStyle,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const { characters } = (await res.json()) as {
        characters: CharacterGroup[];
      };
      return characters;
    };

    try {
      updateLastMessage("Generating character sheets...");

      // Retry up to 2 times on the client side (server also retries internally)
      let characters: CharacterGroup[] | null = null;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          characters = await attemptGeneration();
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            updateLastMessage("First attempt didn't work, retrying...");
          }
        }
      }

      if (!characters) {
        throw lastError ?? new Error("Generation failed");
      }

      // Update assistant message with character groups
      updateLastMessage(
        "Here are your character sheets! Each character is shown from four angles \u2014 front, back, right, and left.",
        { characterGroups: characters }
      );

      // Now send a follow-up to the chat API so the agent can acknowledge and move on
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

      updateLastMessage(
        "Here are your scene locations!",
        { sceneImages }
      );

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

      updateLastMessage(
        "Here are your scene thumbnails with characters!",
        { sceneImages }
      );

      await streamChatResponse(addMessage, updateLastMessage, get().messages);
    } catch {
      updateLastMessage("Sorry, something went wrong generating scene thumbnails. Please try again.");
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
