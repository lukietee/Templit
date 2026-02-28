import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (role: "user" | "assistant", content: string) => void;
  updateLastMessage: (content: string) => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to Templit! I'll help you create your video. The editor is ready — use the preview and timeline to review your footage.",
      timestamp: Date.now(),
    },
  ],
  isLoading: false,

  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
      ],
    })),

  updateLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
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
    } catch {
      updateLastMessage("Sorry, something went wrong. Please try again.");
    } finally {
      set({ isLoading: false });
    }
  },
}));
