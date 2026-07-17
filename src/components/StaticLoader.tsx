"use client";

import { useEffect, useRef } from "react";
import { createNoisePainter, observeCanvasSize } from "@/lib/tvStatic";

// Inline loading state in the same broadcast language as the boot
// sequence: live snow with orange/grey specks + a drifting roll band.
// Used wherever the page waits on something (e.g. Stripe mounting).
export function StaticLoader({
  label = "Tuning…",
  className = "h-40",
}: {
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stopResize = observeCanvasSize(canvas);
    const paint = createNoisePainter(canvas, 120, 80);

    // Reduced motion: paint one still frame, no loop.
    if (reduce) {
      paint({ intensity: 0.5, tint: 0.05, roll: -1 });
      return stopResize;
    }

    let raf = 0;
    let last = 0;
    const start = performance.now();

    const loop = (now: number) => {
      if (now - last > 45) {
        last = now;
        const roll = ((now - start) / 1400) % 1;
        paint({ intensity: 0.6, tint: 0.05, roll });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      stopResize();
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
        <span className="tracking-nav flex items-center gap-2.5 border border-gray/25 bg-ink/90 px-4 py-2 font-sans text-[11px] uppercase text-gray">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal"
          />
          {label}
        </span>
      </div>
  );
}
