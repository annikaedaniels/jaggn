// ─────────────────────────────────────────────────────────────
//  Real broadcast snow, painted on canvas.
//
//  CSS grain (see .tv-static in globals.css) is cheap and good for a
//  permanent overlay, but it's a static texture that only flickers in
//  opacity. For the boot sequence we want genuine randomized pixels —
//  that's what reads as a dead channel.
//
//  Technique: paint noise into a tiny offscreen buffer (~180×120), then
//  blit it scaled-up with smoothing off. Cheap, and the chunky pixels
//  look like a CRT rather than fine photographic grain.
// ─────────────────────────────────────────────────────────────

export const PALETTE = {
  ink: [13, 13, 13] as const,      // #0D0D0D
  gray: [194, 197, 193] as const,  // #C2C5C1
  signal: [255, 90, 0] as const,   // #FF5A00
};

const ACCENTS = [PALETTE.signal, PALETTE.gray, PALETTE.ink];

export type PaintOpts = {
  /** 0..1 — opacity of the noise pass */
  intensity?: number;
  /** 0..1 — chance any given pixel takes a palette color instead of grey */
  tint?: number;
  /** y position (0..1) of the VHS roll band; negative = hidden */
  roll?: number;
  /** fill the frame with this palette color before noise (flash frames) */
  flash?: readonly [number, number, number] | null;
  /** draw the orange/grey/black vertical test bars */
  bars?: boolean;
  /** 0..1 — fraction of pixels re-randomized per paint; rest keep last frame's value (1 = classic full flicker) */
  churn?: number;
};

export function createNoisePainter(
  canvas: HTMLCanvasElement,
  bufW = 180,
  bufH = 120,
) {
  const ctx = canvas.getContext("2d");
  const buf = document.createElement("canvas");
  buf.width = bufW;
  buf.height = bufH;
  const bctx = buf.getContext("2d");
  if (!ctx || !bctx) return () => {};

  const img = bctx.createImageData(bufW, bufH);
  const data = img.data;

  return function paint(opts: PaintOpts = {}) {
    const {
      intensity = 1,
      tint = 0.03,
      roll = -1,
      flash = null,
      bars = false,
      churn = 1,
    } = opts;

    const w = canvas.width;
    const h = canvas.height;

    ctx.imageSmoothingEnabled = false;

    // Base layer: flash frame, test bars, or black.
    if (flash) {
      ctx.fillStyle = `rgb(${flash[0]},${flash[1]},${flash[2]})`;
      ctx.fillRect(0, 0, w, h);
    } else if (bars) {
      // Brand-palette test pattern: orange / grey / black, repeating.
      const seq = [
        PALETTE.signal,
        PALETTE.ink,
        PALETTE.gray,
        PALETTE.signal,
        PALETTE.ink,
        PALETTE.gray,
        PALETTE.signal,
      ];
      const bw = w / seq.length;
      seq.forEach((c, i) => {
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(i * bw, 0, Math.ceil(bw), h);
      });
    } else {
      ctx.fillStyle = "#0D0D0D";
      ctx.fillRect(0, 0, w, h);
    }

    // Noise pass into the small buffer. With churn < 1, only that fraction of
    // pixels gets a new random value each frame — the rest keep last frame's
    // pixel. Same flicker rate (FPS), far less of the frame changes at once,
    // so it reads as a slow crawl instead of a full strobe.
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = 255;
      if (churn < 1 && Math.random() >= churn) continue;
      if (tint > 0 && Math.random() < tint) {
        const c = ACCENTS[(Math.random() * ACCENTS.length) | 0];
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
      } else {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
    }
    bctx.putImageData(img, 0, 0);

    ctx.globalAlpha = intensity;
    ctx.drawImage(buf, 0, 0, w, h);
    ctx.globalAlpha = 1;

    // VHS roll band — a soft bright bar drifting down the frame.
    if (roll >= 0) {
      const y = roll * h;
      const band = ctx.createLinearGradient(0, y - h * 0.06, 0, y + h * 0.06);
      band.addColorStop(0, "rgba(255,90,0,0)");
      band.addColorStop(0.5, "rgba(255,90,0,0.14)");
      band.addColorStop(1, "rgba(255,90,0,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, y - h * 0.06, w, h * 0.12);
    }

    // Scanlines, to match the rest of the page.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y + 2, w, 1);
  };
}

/** Size a canvas to its CSS box, accounting for DPR (capped — noise doesn't need retina). */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width * dpr));
  const h = Math.max(1, Math.floor(r.height * dpr));
  // Assigning canvas.width/height REALLOCATES the pixel buffer and wipes the
  // context — so skip it when nothing actually changed.
  if (canvas.width === w && canvas.height === h) return false;
  canvas.width = w;
  canvas.height = h;
  return true;
}

/**
 * Keep a canvas sized to its box, cheaply. Returns a cleanup function.
 *
 * Why not `window.addEventListener("resize", fit)`: on iOS, scrolling collapses
 * the URL bar, which fires a burst of resize events *mid-scroll*. Refitting on
 * each one reallocates the canvas buffer repeatedly and janks the scroll —
 * exactly when smoothness matters most.
 *
 * This coalesces any burst into a single fit on the next animation frame, and
 * fitCanvas() no-ops when the dimensions are unchanged.
 */
export function observeCanvasSize(canvas: HTMLCanvasElement) {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitCanvas(canvas));
  };

  fitCanvas(canvas);

  // ResizeObserver fires only when the element's box really changes.
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }

  // Fallback for browsers without ResizeObserver.
  window.addEventListener("resize", schedule);
  return () => {
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
  };
}
