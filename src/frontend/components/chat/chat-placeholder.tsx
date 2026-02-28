"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/frontend/stores/use-chat-store";
import { MessageSquare, Send, Loader2, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/frontend/lib/utils";

export function ChatPlaceholder() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [input, setInput] = useState("");
  const initializeWithPrompt = useChatStore((s) => s.initializeWithPrompt);
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read landing page prompt from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("templit-prompt");
    if (!stored) return;
    try {
      const { prompt } = JSON.parse(stored) as { prompt: string };
      if (prompt) {
        initializeWithPrompt(prompt);
      }
    } catch {
      // Invalid JSON — ignore
    }
  }, [initializeWithPrompt]);

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
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(trimmed);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
            ) : msg.role === "assistant" ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="block text-[var(--foreground)] font-semibold mt-3 first:mt-0">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  li: ({ children }) => <li>{children}</li>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {files.map((file, i) => (
              <span
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-[var(--muted)] text-xs text-[var(--muted-foreground)] border border-[var(--border)]"
              >
                {file.name}
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none max-h-32 overflow-y-auto",
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
