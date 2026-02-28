"use client";

import { useChatStore } from "@/stores/use-chat-store";
import { MessageSquare } from "lucide-react";

export function ChatPlaceholder() {
  const messages = useChatStore((s) => s.messages);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold">Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
              msg.role === "assistant"
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "bg-[var(--accent)] text-white ml-auto"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Disabled input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Chat coming soon..."
            disabled
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
