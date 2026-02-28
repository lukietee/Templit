import { PromptBox } from "@/frontend/components/landing/prompt-box";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 w-full">
        <h1 className="text-3xl font-bold tracking-tight">Templit</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Describe your video idea to get started
        </p>
        <PromptBox />
      </div>
    </main>
  );
}
