import { PromptBox } from "@/frontend/components/landing/prompt-box";
import { Logo } from "@/frontend/components/landing/logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 bg-white overflow-hidden">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[800px] bg-gradient-to-r from-blue-100 to-indigo-100 blur-[100px] rounded-full opacity-60" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-16 w-48 md:h-24 md:w-64 text-black" />
          <p className="text-sm md:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            Describe your vision. Your AI video agent will assemble the perfect cut.
          </p>
        </div>
        <PromptBox />
      </div>
    </main>
  );
}
