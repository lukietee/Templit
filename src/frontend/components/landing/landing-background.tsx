"use client";

import React, { useEffect, useRef } from "react";

interface Dot {
    x: number;
    y: number;
    originX: number;
    originY: number;
    vx: number;
    vy: number;
}

export function LandingBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef({ x: -1000, y: -1000 });
    const dots = useRef<Dot[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        const initGrid = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            canvas.width = w;
            canvas.height = h;

            const spacing = 40;
            const newDots: Dot[] = [];

            for (let x = spacing / 2; x < w; x += spacing) {
                for (let y = spacing / 2; y < h; y += spacing) {
                    newDots.push({
                        x,
                        y,
                        originX: x,
                        originY: y,
                        vx: 0,
                        vy: 0,
                    });
                }
            }
            dots.current = newDots;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouse.current = { x: -1000, y: -1000 };
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const radius = 180;
            const lerpFactor = 0.1;
            const maxDisplacement = 25;

            dots.current.forEach((dot) => {
                const dx = mouse.current.x - dot.originX;
                const dy = mouse.current.y - dot.originY;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);

                let targetX = dot.originX;
                let targetY = dot.originY;

                if (dist < radius) {
                    // Inverse falloff attraction: strength = 1 - (dist / radius)^2
                    // Or a more pronounced curve: 1 - sin((dist/radius) * (PI/2))
                    const strength = Math.pow(1 - dist / radius, 2);
                    const angle = Math.atan2(dy, dx);

                    targetX = dot.originX + Math.cos(angle) * strength * maxDisplacement;
                    targetY = dot.originY + Math.sin(angle) * strength * maxDisplacement;
                }

                // Smooth Lerp
                dot.x += (targetX - dot.x) * lerpFactor;
                dot.y += (targetY - dot.y) * lerpFactor;

                // Draw Dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(100, 120, 180, 0.4)";
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        initGrid();
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("resize", initGrid);
        render();

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("resize", initGrid);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none bg-white"
        />
    );
}
