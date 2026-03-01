"use client";

import { useEffect, useState } from "react";

const THUMBNAILS = [
  { src: "/thumbnails/frame5.png", alt: "Scene 1" },
  { src: "/thumbnails/Frame6.png", alt: "Scene 2" },
  { src: "/thumbnails/frame7.png", alt: "Scene 3" },
  { src: "/thumbnails/frame8.png", alt: "Scene 4" },
  { src: "/thumbnails/frame9.png", alt: "Scene 5" },
  { src: "/thumbnails/frame10.png", alt: "Scene 6" },
];

/** Fixed positions for each floating card (percentage-based), 3 on each side */
const POSITIONS: {
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  width: number;
  delay: number;
  duration: number;
}[] = [
  { top: "6%", left: "8%", rotate: -12, width: 310, delay: 0, duration: 6 },
  { top: "42%", left: "5%", rotate: 7, width: 290, delay: 1.2, duration: 5.4 },
  { top: "72%", left: "14%", rotate: -5, width: 270, delay: 0.6, duration: 6.6 },
  { top: "4%", right: "7%", rotate: 10, width: 300, delay: 0.8, duration: 5.8 },
  { top: "40%", right: "5%", rotate: -8, width: 285, delay: 1.8, duration: 6.2 },
  { top: "70%", right: "12%", rotate: 5, width: 275, delay: 0.3, duration: 5.6 },
];

export function FloatingThumbnails() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {THUMBNAILS.map((thumb, i) => {
        const pos = POSITIONS[i];
        return (
          <div
            key={thumb.src}
            className="absolute pointer-events-none z-0"
            style={{
              top: pos.top,
              ...(pos.left !== undefined ? { left: pos.left } : {}),
              ...(pos.right !== undefined ? { right: pos.right } : {}),
              width: pos.width,
              opacity: mounted ? 0.85 : 0,
              transform: `rotate(${pos.rotate}deg)`,
              transition: `opacity 0.8s ease ${i * 0.15}s`,
              animation: mounted
                ? `floating-y ${pos.duration}s ease-in-out ${pos.delay}s infinite`
                : "none",
            }}
          >
            <div className="rounded-xl overflow-hidden shadow-lg shadow-black/10 border border-slate-200/60">
              <img
                src={thumb.src}
                alt={thumb.alt}
                className="w-full h-auto block"
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
