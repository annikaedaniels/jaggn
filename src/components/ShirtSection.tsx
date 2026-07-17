"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { shirt } from "@/data/site";
import { CheckoutModal } from "@/components/CheckoutModal";

// Show a nudge only when it's genuinely nearly gone — a fake-urgency counter
// on a healthy stock level is the kind of thing this band's audience clocks.
const LOW_STOCK_AT = 10;

export function ShirtSection() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [view, setView] = useState(0); // 0 = front, 1 = back

  // Stock is optional (see lib/stock.ts) — if it's off, this stays null and
  // the section behaves exactly as it always has.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stock");
        const data = await res.json();
        if (!cancelled && data?.enabled) setLeft(data.remaining);
      } catch {
        /* stock is a nicety — never let it break the page */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const soldOut = left !== null && left <= 0;
  const lowStock = left !== null && left > 0 && left <= LOW_STOCK_AT;

  return (
    <section id="shirts" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-8 text-center sm:mb-10">Shirts</p>

        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
          {/* ── Product views ───────────────────────────────── */}
          <div>
            <div className="relative border border-gray/25 p-2">
              <div className="relative aspect-square overflow-hidden bg-ink">
                {/* Both views are mounted and cross-faded rather than swapped:
                    the second image is then already decoded, so switching is
                    instant instead of flashing an empty box on a phone. */}
                {shirt.images.map((img, i) => (
                  <Image
                    key={img.src}
                    src={img.src}
                    alt={`${shirt.name} — ${img.label}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 420px"
                    priority={i === 0}
                    className={`object-contain transition-opacity duration-300 ${
                      soldOut ? "opacity-40 grayscale" : ""
                    } ${i === view ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  />
                ))}
              </div>

              {soldOut && (
                <span className="tracking-nav absolute left-4 top-4 border border-signal bg-ink/90 px-3 py-1 font-sans text-[10px] uppercase text-signal">
                  Sold out
                </span>
              )}
            </div>

            {/* Front / Back switch */}
            <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Product views">
              {shirt.images.map((img, i) => (
                <button
                  key={img.label}
                  onClick={() => setView(i)}
                  aria-pressed={i === view}
                  className={`tap tracking-nav border px-4 font-sans text-[10px] uppercase transition-colors ${
                    i === view
                      ? "border-signal text-signal"
                      : "border-gray/25 text-grayDim hover:border-signal hover:text-signal"
                  }`}
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Details + buy ───────────────────────────────── */}
          <div className="text-center md:text-left">
            <h2 className="text-4xl text-gray sm:text-5xl">{shirt.name}</h2>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <span className="font-display text-3xl text-signal">
                {shirt.displayPrice}
              </span>
              <span className="tracking-nav border border-signal/50 px-2 py-1 font-sans text-[10px] uppercase text-signal">
                Free shipping
              </span>
              {lowStock && (
                <span className="tracking-nav border border-gray/40 px-2 py-1 font-sans text-[10px] uppercase text-gray">
                  Only {left} left
                </span>
              )}
            </div>

            <p className="mt-4 max-w-sm font-sans text-sm text-grayDim md:mx-0">
              {shirt.blurb}
            </p>

            <button
              onClick={() => setOpen(true)}
              disabled={soldOut}
              className="btn btn-solid mt-8 w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-12"
            >
              {soldOut ? "Sold out" : "Buy now"}
            </button>

            {soldOut && (
              <p className="mt-4 font-sans text-xs text-grayDim">
                Join the list below — restocks go out there first.
              </p>
            )}
          </div>
        </div>
      </div>

      {open && !soldOut && (
        <CheckoutModal
          onClose={() => setOpen(false)}
          onSoldOut={() => {
            setLeft(0);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
