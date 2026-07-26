"use client";

import { useEffect, useRef } from "react";
import { createNoisePainter, observeCanvasSize } from "@/lib/tvStatic";

// ─────────────────────────────────────────────────────────────
//  A background field of live snow, for surfaces that sit ABOVE the
//  page-wide .tv-static overlay (z-40) and would otherwise cover it —
//  full-screen menus, sheets, panels.
//
//  Same canvas noise as the boot sequence, just slow and faint. Runs only
//  while mounted, throttles to a low frame rate, and pauses when the tab is
//  hidden — a full-screen canvas repainting forever is real battery drain on
//  a phone, and grain this subtle doesn't need 60fps to read.
// ─────────────────────────────────────────────────────────────

export function StaticField({
  /** CSS opacity of the whole field — keep it low; this sits behind content */
  opacity = 0.12,
  /** frames per second; snow reads fine well under 24 */
  fps = 14,
  /** 0..1 chance of a palette-colored (orange/grey/black) speck */
  tint = 0.03,
  /** 0..1 — fraction of pixels re-randomized per frame; lower reads calmer without dropping fps */
  churn = 1,
  className = "",
}: {
  opacity?: number;
  fps?: number;
  tint?: number;
  churn?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const stopResize = observeCanvasSize(canvas);
    const paint = createNoisePainter(canvas, 140, 100);

    // Reduced motion: one still frame of grain, no animation.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Full churn: this is the only frame that'll ever paint.
      paint({ intensity: 1, tint, roll: -1 });
      return stopResize;
    }

    let raf = 0;
    let last = 0;
    let paused = false;
    const interval = 1000 / fps;

    const loop = (now: number) => {
      if (!paused && now - last >= interval) {
        last = now;
        paint({ intensity: 1, tint, roll: -1, churn });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      stopResize();
    };
  }, [fps, tint, churn]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity }}
    />
  );
}
