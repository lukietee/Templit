"use client";

import { useProjectStore } from "@/frontend/stores/use-project-store";
import { FileText, Clock, Monitor, MessageSquare } from "lucide-react";

function FieldRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)]">
      <Icon className="w-4 h-4 mt-0.5 text-[var(--muted-foreground)] shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--foreground)]">{label}</p>
        {value ? (
          <p className="text-sm text-[var(--foreground)] mt-0.5">{value}</p>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] italic mt-0.5">
            Waiting...
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectOverview() {
  const { topic, duration, aspectRatio } = useProjectStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background)] border-l border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <FileText className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Project Overview
        </h2>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto">
        <FieldRow icon={MessageSquare} label="Topic" value={topic} />
        <FieldRow icon={Clock} label="Duration" value={duration} />
        <FieldRow icon={Monitor} label="Aspect Ratio" value={aspectRatio} />
      </div>
    </div>
  );
}
