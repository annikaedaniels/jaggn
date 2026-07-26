"use client";

import { useEffect, useRef } from "react";
import { createNoisePainter, observeCanvasSize } from "@/lib/tvStatic";

// ─────────────────────────────────────────────────────────────
//  Page background — faint live snow instead of flat black.
//
//  Sits BEHIND all content (-z-10) at low opacity. This is separate from the
//  page-wide `.tv-static` grain overlay (z-40, sits ON TOP): that one is a
//  fixed texture over everything; this one replaces the dead black backdrop.
//
//  The orange occasionally "swells" — every few seconds the orange speck
//  density eases up and back down on a sine curve, like a signal drifting.
//  Kept deliberately dim (it's a background): the peak is well below the
//  loader/menu fields. Pauses on tab-hide and honours reduced-motion.
// ─────────────────────────────────────────────────────────────

const FPS = 12;                 // keep this smooth — churn (below) is what tames it
const CHURN = 0.3;              // fraction of pixels refreshed per frame (1 = full flicker)
const BASE_TINT = 0.015;        // resting orange/grey speck density
const PULSE_TINT = 0.05;        // extra density at the peak of a swell
const PULSE_PERIOD_MS = 9000;   // one full swell every ~9s
const PULSE_WIDTH = 0.22;       // fraction of the cycle the swell is "on"

export function BackgroundStatic({
  opacity = 0.12,
}: {
  opacity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stopResize = observeCanvasSize(canvas);
    const paint = createNoisePainter(canvas, 140, 100);

    if (reduce) {
      // One still frame at resting density — texture without motion.
      // Full churn here: this is the only frame that'll ever paint, so it
      // needs to be complete rather than partially refreshed.
      paint({ intensity: 1, tint: BASE_TINT, roll: -1 });
      return stopResize;
    }

    let raf = 0;
    let last = 0;
    let paused = false;
    const start = performance.now();
    const interval = 1000 / FPS;

    const loop = (now: number) => {
      if (!paused && now - last >= interval) {
        last = now;

        // Orange swell: a smooth bump once per cycle, flat the rest of the time.
        const phase = ((now - start) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
        let pulse = 0;
        if (phase < PULSE_WIDTH) {
          // 0→1→0 over the pulse window (sine bump)
          pulse = Math.sin((phase / PULSE_WIDTH) * Math.PI);
        }
        const tint = BASE_TINT + pulse * (PULSE_TINT - BASE_TINT);

        paint({ intensity: 1, tint, roll: -1, churn: CHURN });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      stopResize();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      // Fixed, full-viewport, behind everything. Non-interactive.
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity }}
    />
  );
}