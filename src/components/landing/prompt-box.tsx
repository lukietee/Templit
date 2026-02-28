"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal } from "lucide-react";
import { FileUpload } from "./file-upload";

export function PromptBox() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = () => {
    if (!prompt.trim() && files.length === 0) return;

    const payload = {
      prompt: prompt.trim(),
      files: files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    };
    sessionStorage.setItem("templit-prompt", JSON.stringify(payload));
    router.push("/editor");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your video idea..."
          rows={4}
          className="w-full resize-none bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none text-sm leading-relaxed"
        />

        <FileUpload files={files} setFiles={setFiles} />

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() && files.length === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendHorizonal size={16} />
            Create Video
          </button>
        </div>
      </div>
    </div>
  );
}
