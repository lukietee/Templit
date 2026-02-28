"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/use-chat-store";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatPlaceholder() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold">Chat</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "text-sm rounded-lg px-3 py-2 max-w-[90%]",
              msg.role === "assistant"
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "bg-[var(--accent)] text-white ml-auto"
            )}
          >
            {msg.role === "assistant" && msg.content === "" ? (
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </span>
            ) : (
              msg.content
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            className={cn(
              "flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--accent)]",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "p-2 rounded-lg bg-[var(--accent)] text-white",
              isLoading || !input.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-90"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
