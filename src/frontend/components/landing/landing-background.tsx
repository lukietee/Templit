"use client";

import React, { useEffect, useRef } from "react";

export function LandingBackground() {
    const blobRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Aurora Blob Tracking State (target mouse pos vs actual blob pos)
    const target = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Center blob initially
        target.current.x = window.innerWidth / 2;
        target.current.y = window.innerHeight / 2;
        current.current.x = window.innerWidth / 2;
        current.current.y = window.innerHeight / 2;

        const handleMouseMove = (e: MouseEvent) => {
            target.current.x = e.clientX;
            target.current.y = e.clientY;
        };

        window.addEventListener("mousemove", handleMouseMove);

        // Animation Loop for Blob and Grain
        let animationFrameId: number;
        let canvasWidth = window.innerWidth;
        let canvasHeight = window.innerHeight;

        // Canvas context setup
        const ctx = canvasRef.current?.getContext("2d", { alpha: true });

        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasWidth = window.innerWidth;
                canvasHeight = window.innerHeight;
                canvasRef.current.width = canvasWidth;
                canvasRef.current.height = canvasHeight;
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const render = () => {
            // 1. Blob Lerping
            // Lerp logic: current = current + (target - current) * smoothFactor
            current.current.x += (target.current.x - current.current.x) * 0.05;
            current.current.y += (target.current.y - current.current.y) * 0.05;

            if (blobRef.current) {
                // Shift exact center to the pointer by subtracting half the blob's width (600px/2 = 300px)
                const translateX = current.current.x - 300;
                const translateY = current.current.y - 300;
                blobRef.current.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
            }

            // 2. Film Grain Redraw
            if (ctx && canvasWidth > 0 && canvasHeight > 0) {
                // Create an ImageData object for noise
                const imageData = ctx.createImageData(canvasWidth, canvasHeight);
                const data = imageData.data;
                const length = data.length;

                for (let i = 0; i < length; i += 4) {
                    // Generate a purely random grayscale value
                    const value = Math.random() * 255;
                    data[i] = value;     // R
                    data[i + 1] = value; // G
                    data[i + 2] = value; // B
                    // Randomize alpha very slightly for flicker, keeping it extremely subtle but visible
                    data[i + 3] = Math.random() * 25; // Alpha out of 255 (25/255 is ~0.10)
                }

                ctx.putImageData(imageData, 0, 0);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            {/* Container to trap everything behind content */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-white">

                {/* Layer 1: Aurora Blob (Moving light gradient) */}
                {/* We use a large rounded div that orbits the cursor, heavily blurred to act as an aura */}
                <div
                    ref={blobRef}
                    className="absolute h-[600px] w-[600px] rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-80 blur-[100px] will-change-transform mix-blend-multiply"
                />

                {/* 
          Static subtle central glow behind normal layout 
          (so it's not totally white even when pointer is away) 
        */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-100/60 blur-[120px] pointer-events-none" />

                {/* Layer 2: Film Grain Overlay */}
                {/* A canvas that constantly redraws noise directly on top of the glowing aura, but behind layout */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full mix-blend-overlay opacity-80"
                    style={{ willChange: "contents" }}
                />
            </div>
        </>
    );
}
