"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { Paperclip, X } from "lucide-react";

export interface FileUploadRef {
  openPicker: () => void;
}

interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  hideDefaultTrigger?: boolean;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(
  ({ files, setFiles, hideDefaultTrigger = false }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      openPicker: () => {
        inputRef.current?.click();
      },
    }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      }
      if (inputRef.current) inputRef.current.value = "";
    };

    const removeFile = (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
      <div className="flex flex-col gap-2">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-[var(--background)] text-xs text-[var(--muted-foreground)] border border-[var(--border)]"
              >
                {file.name}
                <button
                  onClick={() => removeFile(index)}
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {!hideDefaultTrigger && (
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors self-start"
          >
            <Paperclip size={14} />
            Attach files
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          accept="image/*,audio/*,video/*,.pdf"
          className="hidden"
        />
      </div>
    );
  }
);
FileUpload.displayName = "FileUpload";
