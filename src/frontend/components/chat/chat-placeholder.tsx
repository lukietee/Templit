"use client";

import { useEffect, useRef, useState } from "react";
import {
  useChatStore,
  type ChatMessage,
  type CharacterGroup,
} from "@/frontend/stores/use-chat-store";
import { MessageSquare, Send, Loader2, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/frontend/lib/utils";

function CharacterGrid({ group }: { group: CharacterGroup }) {
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-[var(--foreground)] mb-1.5">
        {group.name}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {group.images.map((img, i) => (
          <div key={i} className="relative">
            <img
              src={`data:${img.mimeType};base64,${img.data}`}
              alt={`${group.name} — ${img.label}`}
              className="w-full aspect-square object-cover rounded-md border border-[var(--border)]"
            />
            {img.label && (
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                {img.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserImageThumbnails({ msg }: { msg: ChatMessage }) {
  if (!msg.images || msg.images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {msg.images.map((img, i) => (
        <img
          key={i}
          src={`data:${img.mimeType};base64,${img.data}`}
          alt={img.label || `Upload ${i + 1}`}
          className="w-16 h-16 object-cover rounded-md border border-white/20"
        />
      ))}
    </div>
  );
}

export function ChatPlaceholder() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendMessageWithImages = useChatStore((s) => s.sendMessageWithImages);
  const [input, setInput] = useState("");
  const initializeWithPrompt = useChatStore((s) => s.initializeWithPrompt);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
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

  // Generate previews for image files
  useEffect(() => {
    const urls: string[] = [];
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        urls.push(URL.createObjectURL(file));
      } else {
        urls.push("");
      }
    });
    setFilePreviews(urls);
    return () => urls.forEach((u) => { if (u) URL.revokeObjectURL(u); });
  }, [files]);

  const handleSend = () => {
    const trimmed = input.trim();
    const hasFiles = files.length > 0;
    if ((!trimmed && !hasFiles) || isLoading) return;

    const currentFiles = [...files];
    setInput("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (currentFiles.some((f) => f.type.startsWith("image/"))) {
      sendMessageWithImages(trimmed, currentFiles);
    } else {
      sendMessage(trimmed);
    }
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

  const hasContent = input.trim() || files.length > 0;

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
            {msg.role === "assistant" && msg.content === "" && !msg.characterGroups ? (
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </span>
            ) : msg.role === "assistant" ? (
              <>
                {msg.content && (
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
                )}
                {msg.characterGroups?.map((group, i) => (
                  <CharacterGrid key={i} group={group} />
                ))}
              </>
            ) : (
              <>
                {msg.content}
                <UserImageThumbnails msg={msg} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] overflow-hidden">
          {/* Image previews inside the container */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative group"
                >
                  {filePreviews[i] ? (
                    <>
                      <img
                        src={filePreviews[i]}
                        alt={file.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--foreground)] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 bg-[var(--background)] text-xs text-[var(--muted-foreground)]">
                      {file.name}
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-[var(--foreground)] transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
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
              "w-full text-sm px-3 py-2.5 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none resize-none max-h-32 overflow-y-auto",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          />

          {/* Button row */}
          <div className="flex items-center justify-between px-2 pb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={cn(
                "p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors",
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
            <button
              onClick={handleSend}
              disabled={isLoading || !hasContent}
              className={cn(
                "p-1.5 rounded-lg bg-[var(--accent)] text-white",
                isLoading || !hasContent
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
