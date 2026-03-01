"use client";

import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/frontend/stores/use-project-store";
import type { CharacterGroup, SceneImage } from "@/frontend/stores/use-chat-store";
import ReactMarkdown from "react-markdown";

/** Shared markdown component overrides */
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-[var(--foreground)] mb-2 mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1.5 mt-3">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-medium text-[var(--foreground)] mb-1 mt-2">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-[var(--foreground)] mb-2 leading-relaxed">
      {children}
    </p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--foreground)]">
      {children}
    </strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5 text-sm">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[var(--foreground)]">{children}</li>
  ),
};

/** Split overview markdown into sections by ## headers */
function splitSections(md: string): { heading: string; body: string }[] {
  const lines = md.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({ heading: currentHeading, body: currentLines.join("\n") });
      }
      currentHeading = line.replace(/^## /, "").trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, body: currentLines.join("\n") });
  }

  return sections;
}

function CharacterThumbnails({
  groups,
  onImageClick,
}: {
  groups: CharacterGroup[];
  onImageClick: (src: string) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="mb-3 space-y-2">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="text-xs text-[var(--muted-foreground)] mb-1">
            {group.name}
          </p>
          <div className="flex gap-1">
            {group.images.map((img, i) => (
              <button
                key={i}
                type="button"
                className="w-12 h-12 rounded overflow-hidden border border-[var(--border)] hover:border-indigo-500 transition-colors flex-shrink-0"
                onClick={() =>
                  onImageClick(`data:${img.mimeType};base64,${img.data}`)
                }
              >
                <img
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={`${group.name} view ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneThumbnails({
  images,
  onImageClick,
}: {
  images: SceneImage[];
  onImageClick: (src: string) => void;
}) {
  if (images.length === 0) return null;
  return (
    <div className="mb-3 grid grid-cols-3 gap-1.5">
      {images.map((scene) => {
        const src = `data:${scene.image.mimeType};base64,${scene.image.data}`;
        return (
          <button
            key={scene.title}
            type="button"
            className="relative aspect-video rounded overflow-hidden border border-[var(--border)] hover:border-indigo-500 transition-colors"
            onClick={() => onImageClick(src)}
          >
            <img
              src={src}
              alt={scene.title}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white px-1 py-0.5 truncate">
              {scene.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProjectOverview() {
  const overview = useProjectStore((s) => s.overview);
  const characterImages = useProjectStore((s) => s.characterImages);
  const sceneLocationImages = useProjectStore((s) => s.sceneLocationImages);
  const sceneThumbnailImages = useProjectStore((s) => s.sceneThumbnailImages);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc, closeLightbox]);

  const sections = overview ? splitSections(overview) : [];

  return (
    <div className="h-full flex flex-col bg-[var(--background)] border-l border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Project Overview
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {overview ? (
          <div className="prose prose-sm max-w-none text-[var(--foreground)]">
            {sections.map((section, i) => (
              <div key={i}>
                <ReactMarkdown components={markdownComponents}>
                  {section.body}
                </ReactMarkdown>
                {section.heading === "Characters" &&
                  characterImages.length > 0 && (
                    <CharacterThumbnails
                      groups={characterImages}
                      onImageClick={setLightboxSrc}
                    />
                  )}
                {section.heading === "Scene Locations" &&
                  sceneLocationImages.length > 0 && (
                    <SceneThumbnails
                      images={sceneLocationImages}
                      onImageClick={setLightboxSrc}
                    />
                  )}
                {section.heading === "Scene Thumbnails" &&
                  sceneThumbnailImages.length > 0 && (
                    <SceneThumbnails
                      images={sceneThumbnailImages}
                      onImageClick={setLightboxSrc}
                    />
                  )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] italic">
            The agent will write a project description here as details are
            gathered...
          </p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          onClick={closeLightbox}
        >
          <img
            src={lightboxSrc}
            alt="Full size preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
