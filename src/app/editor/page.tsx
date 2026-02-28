"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PromptData {
  prompt: string;
  files: { name: string; size: number; type: string }[];
}

export default function EditorPage() {
  const router = useRouter();
  const [data, setData] = useState<PromptData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("templit-prompt");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 gap-4">
      <h1 className="text-2xl font-bold">Editor</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Placeholder for the editing screen.
      </p>

      {data && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 max-w-lg w-full text-sm">
          <p className="font-medium mb-2">Received prompt:</p>
          <p className="text-[var(--muted-foreground)] whitespace-pre-wrap">
            {data.prompt || "(no prompt)"}
          </p>
          {data.files.length > 0 && (
            <>
              <p className="font-medium mt-3 mb-1">
                Attached files ({data.files.length}):
              </p>
              <ul className="text-[var(--muted-foreground)]">
                {data.files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => router.push("/")}
        className="text-xs text-[var(--accent)] hover:underline mt-2"
      >
        Back to home
      </button>
    </main>
  );
}
