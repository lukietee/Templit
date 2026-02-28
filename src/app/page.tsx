import { PromptBox } from "@/frontend/components/landing/prompt-box";
import { Logo } from "@/frontend/components/landing/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 w-full">
        <Logo className="h-16 w-32 md:h-20 md:w-40" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Describe your video idea to get started
        </p>
        <PromptBox />
      </div>
    </main>
  );
}
