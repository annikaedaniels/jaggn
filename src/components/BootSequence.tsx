"use client";

import { useEffect, useRef, useState } from "react";
import { createNoisePainter, observeCanvasSize, PALETTE } from "@/lib/tvStatic";
import { site } from "@/data/site";

// ─────────────────────────────────────────────────────────────
//  Tuning into Channel 7700.
//
//  Timeline (ms):
//    0–650     SNOW   — full noise, "NO SIGNAL"
//    650–1250  BARS   — orange/grey/black test bars punching through the
//                       static, roll band, palette flash frames
//    1250–1750 LOCK   — noise thins out, "SIGNAL LOCKED"
//    1750–2050 fade the overlay away
//
//  Click / any key skips. Reduced-motion skips entirely.
//  Plays on every full page load (including reloads) — the root layout
//  only remounts on an actual navigation/reload, not on client-side
//  route changes, so this never replays mid-session by itself.
// ─────────────────────────────────────────────────────────────

const SNOW_END = 650;
const BARS_END = 1250;
const LOCK_END = 1750;
const FADE_MS = 300;

const FLASHES = [PALETTE.signal, PALETTE.ink, PALETTE.gray] as const;

// ── Photosensitivity safety ──────────────────────────────────
// Large-area luminance flashing above ~3 per second can trigger seizures
// (WCAG 2.3.1). These caps keep the flash punchy but under that ceiling:
// hard limit on total flashes, and a minimum gap between them.
// Don't lower FLASH_GAP_MS or raise MAX_FLASHES without understanding this.
const MAX_FLASHES = 3;
const FLASH_GAP_MS = 320;
const FLASH_DUR_MS = 50;

export function BootSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"snow" | "bars" | "lock">("snow");
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Decide up front whether to show at all.
  const [active, setActive] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsTouch(window.matchMedia("(hover: none), (pointer: coarse)").matches);
    if (reduce) return;
    setActive(true);
  }, []);

  // ── Scroll lock ──────────────────────────────────────────────
  // Keyed on `done`, NOT on mount. The component doesn't unmount when the boot
  // ends — it just renders null — so a lock tied to mount would never release
  // and the page would be frozen forever. Every exit path (timeline end, click,
  // keypress) flips `done`, which runs this cleanup.
  useEffect(() => {
    if (!active || done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active, done]);

  // ── Once finished: fade out, unmount ───────────────────────────
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), FADE_MS);
    return () => clearTimeout(t);
  }, [done]);

  // ── The animation ────────────────────────────────────────────
  useEffect(() => {
    if (!active || done) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const stopResize = observeCanvasSize(canvas);
    const paint = createNoisePainter(canvas);

    const start = performance.now();
    let raf = 0;
    let last = 0;
    let flashUntil = 0;
    let flashCount = 0;
    let lastFlashEnd = 0;
    let flashColor: (typeof FLASHES)[number] | null = null;

    // Single exit point. Flipping `done` releases the scroll lock, stops this
    // loop, and starts the fade — all via the effects above.
    const finish = () => setDone(true);

    const loop = (now: number) => {
      const t = now - start;

      // Throttle to ~24fps — TV snow shouldn't be silky.
      if (now - last > 42) {
        last = now;

        if (t < SNOW_END) {
          setPhase("snow");
          paint({ intensity: 1, tint: 0.02, roll: (t / SNOW_END) * 1.2 });
        } else if (t < BARS_END) {
          setPhase("bars");
          // Punch in a palette flash frame — rate-limited (see caps above).
          if (flashCount < MAX_FLASHES && now > lastFlashEnd + FLASH_GAP_MS) {
            flashColor = FLASHES[(Math.random() * FLASHES.length) | 0];
            flashUntil = now + FLASH_DUR_MS;
            lastFlashEnd = flashUntil;
            flashCount++;
          }
          const flashing = now < flashUntil;
          paint({
            bars: true,
            flash: flashing ? flashColor : null,
            intensity: flashing ? 0.5 : 0.42,
            tint: 0.06,
            roll: ((t - SNOW_END) / (BARS_END - SNOW_END)) * 1.2,
          });
        } else if (t < LOCK_END) {
          setPhase("lock");
          // Signal resolving: noise falls away.
          const p = (t - BARS_END) / (LOCK_END - BARS_END);
          paint({ intensity: 1 - p * 0.75, tint: 0.02, roll: -1 });
        } else {
          finish();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    const skip = () => finish();
    window.addEventListener("keydown", skip);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", skip);
      stopResize();
    };
  }, [active, done]);

  if (!active || hidden) return null;

  const label =
    phase === "snow"
      ? "NO SIGNAL"
      : phase === "bars"
        ? "TUNING…"
        : "SIGNAL LOCKED";

  return (
    <div
      className="fixed inset-0 z-[100] cursor-pointer bg-ink transition-opacity duration-300"
      style={{ opacity: done ? 0 : 1 }}
      onClick={() => setDone(true) /* same exit path as the timeline */}
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Broadcast HUD over the snow */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
        <span
          className={`font-display text-4xl uppercase text-gray sm:text-6xl ${
            phase === "lock" ? "" : "rgb-split"
          }`}
        >
          {site.channel}
        </span>
        <span
          className={`font-sans text-[11px] uppercase ${
            phase === "lock" ? "text-signal" : "text-grayDim"
          } tracking-nav`}
        >
          {label}
        </span>
      </div>

      {/* Corner bug + skip hint */}
      <div className="pin-bl-safe tracking-nav pointer-events-none flex items-center gap-2 font-sans text-[10px] uppercase text-grayDim">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-signal" />
        CH 7700
      </div>
      <span className="pin-br-safe tracking-nav pointer-events-none font-sans text-[10px] uppercase text-grayDim">
        {/* Phones have no keyboard to press — tapping already skips. */}
        {isTouch ? "Tap to skip" : "Press any key to skip"}
      </span>
    </div>
  );
}