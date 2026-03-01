"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Plus } from "lucide-react";
import { FileUpload, FileUploadRef } from "./file-upload";

const SUGGESTIONS = [
  "Cinematic tech review in 4k",
  "Funny dog compilation with vine booms",
  "Moody music video visualizer"
];

export function PromptBox() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileUploadRef = useRef<FileUploadRef>(null);

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
    <div className="w-full flex flex-col gap-6 items-center">
      {/* Main Input Box */}
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all focus-within:border-blue-500/30 focus-within:shadow-[0_8px_30px_rgb(59,130,246,0.08)]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the video you want to create..."
          rows={3}
          className="w-full resize-none bg-transparent text-slate-800 placeholder:text-slate-400 outline-none text-sm leading-relaxed"
        />

        <FileUpload
          files={files}
          setFiles={setFiles}
          ref={fileUploadRef}
          hideDefaultTrigger={true}
        />

        <div className="flex items-center justify-between pt-2">
          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileUploadRef.current?.openPicker()}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center border border-transparent hover:border-slate-200"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() && files.length === 0}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Suggestion Pills */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium mr-1">Try:</span>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.slice(0, 2).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setPrompt(suggestion)}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-medium text-slate-600 shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.slice(2).map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setPrompt(suggestion)}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-medium text-slate-600 shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
