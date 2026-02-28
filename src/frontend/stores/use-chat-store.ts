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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  images?: ChatImage[];
  characterGroups?: CharacterGroup[];
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

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentStep: number;
  initialized: boolean;
  addMessage: (
    role: "user" | "assistant",
    content: string,
    extra?: Partial<Pick<ChatMessage, "images" | "characterGroups">>
  ) => void;
  updateLastMessage: (
    content: string,
    extra?: Partial<Pick<ChatMessage, "characterGroups">>
  ) => void;
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithImages: (content: string, files: File[]) => Promise<void>;
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
      const history = get()
        .messages.slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

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
        const cleaned = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
        updateLastMessage(cleaned);
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
        "Here are your character sheets! Each character is shown from four angles — front, back, right, and left.",
        { characterGroups: characters }
      );

      // Now send a follow-up to the chat API so the agent can acknowledge and move on
      const msgs = get().messages;
      const history = msgs.map((m) => ({
        role: m.role,
        content: m.characterGroups
          ? m.content + "\n\n[Character sheets were generated successfully for: " +
            m.characterGroups.map((c) => c.name).join(", ") + "]"
          : m.content,
      }));

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (chatRes.ok) {
        // Add a new assistant message for the chat response
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
          const cleaned = accumulated.replace(/<!--PROJECT_MD:[^]*?-->/, "").trimEnd();
          updateLastMessage(cleaned);
        }
      }
    } catch {
      updateLastMessage("Sorry, something went wrong generating character sheets. Please try again.");
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
