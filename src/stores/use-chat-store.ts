import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (role: "user" | "assistant", content: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to Templit! I'll help you create your video. The editor is ready — use the preview and timeline to review your footage.",
      timestamp: Date.now(),
    },
  ],
  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
      ],
    })),
}));
