"use client";

import Image from "next/image";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ChatPlaceholder } from "@/frontend/components/chat/chat-placeholder";
import { ProjectOverview } from "./project-overview";

export function EditorLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="flex items-center px-4 py-2 border-b border-[var(--border)] bg-white shrink-0">
        <Image src="/mainlogo.svg" alt="Templit" width={100} height={28} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <Group orientation="horizontal">
          <Panel defaultSize="35%" minSize="15%">
            <ChatPlaceholder />
          </Panel>

          <Separator className="w-1.5 bg-[var(--border)] transition-colors cursor-col-resize" />

          <Panel defaultSize="65%" minSize="40%">
            <ProjectOverview />
          </Panel>
        </Group>
      </div>
    </div>
  );
}
