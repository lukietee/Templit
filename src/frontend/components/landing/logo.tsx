import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`group relative flex items-center justify-center cursor-pointer ${className || ""}`}>
      {/* SVG Container with hover animations - glow, scale, and subtle upward shift */}
      <svg
        viewBox="0 0 50 50"
        className="h-full w-full fill-current text-[var(--foreground)] transition-all duration-500 ease-out 
                   group-hover:scale-110 group-hover:-translate-y-1 
                   group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* The 'T' with a swooping left hook */}
        <path
          d="M5,5 Q15,18 25,18 V48 H36 V18 H50 V8 H25 Q13,8 5,5 Z"
          className="transition-all duration-500 origin-bottom group-hover:text-primary"
        />
      </svg>
    </div>
  );
}
