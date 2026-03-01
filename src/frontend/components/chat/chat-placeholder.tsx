"use client";

import { useEffect, useRef, useState } from "react";
import {
  useChatStore,
  type ChatMessage,
  type CharacterGroup,
  type ChatVideo,
  type SceneImage,
} from "@/frontend/stores/use-chat-store";
import { ArrowUp, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/frontend/lib/utils";

function CharacterGrid({
  group,
  onImageClick,
}: {
  group: CharacterGroup;
  onImageClick: (src: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-[var(--foreground)] mb-2 px-1">
        {group.name}
      </p>
      <div className="grid grid-cols-4 gap-1">
        {group.images.map((img, i) => {
          const src = `data:${img.mimeType};base64,${img.data}`;
          return (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`${group.name} — ${img.label}`}
                className="w-full aspect-square object-cover rounded-md border border-[var(--border)] cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onImageClick(src)}
              />
              {img.label && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {img.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SceneGrid({
  scenes,
  onImageClick,
}: {
  scenes: SceneImage[];
  onImageClick: (src: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {scenes.map((scene, i) => {
        const src = `data:${scene.image.mimeType};base64,${scene.image.data}`;
        return (
          <div key={i} className="relative">
            <img
              src={src}
              alt={scene.title}
              className="w-full aspect-video object-cover rounded-md border border-[var(--border)] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onImageClick(src)}
            />
            <span className="absolute bottom-1.5 left-1.5 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
              {scene.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VideoPlayer({ video }: { video: ChatVideo }) {
  const src = `data:${video.mimeType};base64,${video.data}`;
  return (
    <div className="mt-3">
      <video
        src={src}
        controls
        playsInline
        className="w-full aspect-video rounded-md border border-[var(--border)]"
      />
    </div>
  );
}

function UserImageThumbnails({
  msg,
  onImageClick,
}: {
  msg: ChatMessage;
  onImageClick: (src: string) => void;
}) {
  if (!msg.images || msg.images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {msg.images.map((img, i) => {
        const src = `data:${img.mimeType};base64,${img.data}`;
        return (
          <img
            key={i}
            src={src}
            alt={img.label || `Upload ${i + 1}`}
            className="w-16 h-16 object-cover rounded-md border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onImageClick(src)}
          />
        );
      })}
    </div>
  );
}

export function ChatPlaceholder() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const loadingMessage = useChatStore((s) => s.loadingMessage);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendMessageWithImages = useChatStore((s) => s.sendMessageWithImages);
  const [input, setInput] = useState("");
  const initializeWithPrompt = useChatStore((s) => s.initializeWithPrompt);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxSrc) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxSrc]);

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
      // Capture files eagerly — React 18 batching may defer the updater,
      // and resetting the input value below clears the live FileList.
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
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
      <div className="flex items-center px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold">Chat</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isLastMsg = msg === messages[messages.length - 1];
          const isActiveLoading = msg.role === "assistant" && isLoading && isLastMsg;
          return (
          <div
            key={msg.id}
            className={cn(
              "text-sm max-w-[90%]",
              isActiveLoading && !msg.characterGroups?.length && !msg.sceneImages && !msg.video
                ? ""
                : msg.role === "assistant"
                  ? "rounded-lg px-3 py-2 bg-[var(--muted)] text-[var(--foreground)]"
                  : "rounded-lg px-3 py-2 bg-blue-600 text-white ml-auto"
            )}
          >
            {msg.role === "assistant" ? (
              <>
                {msg.content && !isActiveLoading && (
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
                  <CharacterGrid key={i} group={group} onImageClick={setLightboxSrc} />
                ))}
                {msg.sceneImages && msg.sceneImages.length > 0 && (
                  <SceneGrid scenes={msg.sceneImages} onImageClick={setLightboxSrc} />
                )}
                {msg.video && <VideoPlayer video={msg.video} />}
                {isActiveLoading && (
                  <span className="shimmer-text text-sm font-medium mt-2 block">
                    {loadingMessage}
                  </span>
                )}
              </>
            ) : (
              <>
                {msg.content}
                <UserImageThumbnails msg={msg} onImageClick={setLightboxSrc} />
              </>
            )}
          </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
                "p-1.5 rounded-lg bg-blue-600 text-white",
                isLoading || !hasContent
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90"
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
