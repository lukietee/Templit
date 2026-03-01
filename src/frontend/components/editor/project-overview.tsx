"use client";

import { useProjectStore } from "@/frontend/stores/use-project-store";

import ReactMarkdown from "react-markdown";

export function ProjectOverview() {
  const overview = useProjectStore((s) => s.overview);

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
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-[var(--foreground)] mb-2 mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1.5 mt-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-1 mt-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-[var(--foreground)] mb-2 leading-relaxed">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--foreground)]">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-4 mb-2 space-y-0.5 text-sm">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-4 mb-2 space-y-0.5 text-sm">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-[var(--foreground)]">{children}</li>
                ),
              }}
            >
              {overview}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] italic">
            The agent will write a project description here as details are gathered...
          </p>
        )}
      </div>
    </div>
  );
}
