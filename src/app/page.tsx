import { PromptBox } from "@/frontend/components/landing/prompt-box";
import { Logo } from "@/frontend/components/landing/logo";

import { FloatingThumbnails } from "@/frontend/components/landing/floating-thumbnails";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden">

      <FloatingThumbnails />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-16 w-48 md:h-24 md:w-64 text-black" />
          <p className="text-lg md:text-xl text-black font-medium max-w-md mx-auto leading-relaxed">
            From idea to final cut — powered by AI agents.
          </p>
        </div>
        <PromptBox />
      </div>
    </main>
  );
}
