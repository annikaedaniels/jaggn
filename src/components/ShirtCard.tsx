"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/data/site";
import { CheckoutModal } from "@/components/CheckoutModal";

// Show a nudge only when it's genuinely nearly gone — a fake-urgency counter
// on a healthy stock level is the kind of thing this band's audience clocks.
const LOW_STOCK_AT = 10;

export function ShirtCard({
  product,
  stock,
  onSoldOutSize,
}: {
  product: Product;
  /** This product's per-size remaining counts. null = stock limiting is off. */
  stock: Record<string, number> | null;
  /** Fired when the last unit of a size sells to someone else mid-checkout. */
  onSoldOutSize: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string>(product.sizes[0]);
  const [view, setView] = useState(0); // 0 = front, 1 = back

  const left = stock ? (stock[size] ?? null) : null;
  // Every size gone — the product itself is done, not just this selection.
  const allSoldOut = stock !== null && product.sizes.every((s) => (stock[s] ?? 0) <= 0);
  // The size currently picked has none left (others may still be in stock).
  const sizeSoldOut = left !== null && left <= 0;
  const lowStock = left !== null && left > 0 && left <= LOW_STOCK_AT;

  return (
    <div className="mx-auto grid max-w-[67.2rem] items-center gap-10 md:grid-cols-2">
      {/* ── Product views ───────────────────────────────── */}
      <div>
        <div className="relative border border-gray/25 p-2">
          <div className="relative aspect-square overflow-hidden bg-ink">
            {/* Both views are mounted and cross-faded rather than swapped:
                the second image is then already decoded, so switching is
                instant instead of flashing an empty box on a phone. */}
            {product.images.map((img, i) => (
              <Image
                key={img.src}
                src={img.src}
                alt={`${product.name} — ${img.label}`}
                fill
                sizes="(max-width: 768px) 90vw, 420px"
                priority={i === 0}
                className={`object-contain transition-opacity duration-300 ${
                  allSoldOut ? "opacity-40 grayscale" : ""
                } ${i === view ? "opacity-100" : "pointer-events-none opacity-0"}`}
              />
            ))}
          </div>

          {allSoldOut && (
            <span className="tracking-nav absolute left-4 top-4 border border-signal bg-ink/90 px-3 py-1 font-sans text-[12px] uppercase text-signal">
              Sold out
            </span>
          )}
        </div>

        {/* Front / Back switch */}
        <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Product views">
          {product.images.map((img, i) => (
            <button
              key={img.label}
              onClick={() => setView(i)}
              aria-pressed={i === view}
              className={`tap tracking-nav border px-4 font-sans text-[12px] uppercase transition-colors ${
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
        <h2 className="text-[43px] text-gray sm:text-[58px]">{product.name}</h2>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <span className="font-display text-4xl text-signal">
            {product.displayPrice}
          </span>
          <span className="tracking-nav border border-signal/50 px-2 py-1 font-sans text-[12px] uppercase text-signal">
            Free shipping
          </span>
          {lowStock && (
            <span className="tracking-nav border border-gray/40 px-2 py-1 font-sans text-[12px] uppercase text-gray">
              Only {left} left
            </span>
          )}
        </div>

        <p className="mt-4 max-w-sm font-sans text-[16.8px] text-grayDim md:mx-0">
          {product.blurb}
        </p>

        {/* Size picker */}
        <div
          className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start"
          role="group"
          aria-label="Size"
        >
          {product.sizes.map((s) => {
            const outOfStock = stock !== null && (stock[s] ?? 0) <= 0;
            return (
              <button
                key={s}
                onClick={() => setSize(s)}
                disabled={outOfStock}
                aria-pressed={s === size}
                className={`tap tracking-nav border px-4 py-2 font-sans text-[13px] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  s === size
                    ? "border-signal text-signal"
                    : "border-gray/25 text-grayDim hover:border-signal hover:text-signal"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setOpen(true)}
          disabled={sizeSoldOut}
          className="btn btn-solid mt-8 w-full text-[14.4px] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-12"
        >
          {sizeSoldOut ? "Sold out" : "Buy now"}
        </button>

        {allSoldOut && (
          <p className="mt-4 font-sans text-[14.4px] text-grayDim">
            Join the list below — restocks go out there first.
          </p>
        )}
      </div>

      {open && !sizeSoldOut && (
        <CheckoutModal
          productId={product.id}
          size={size}
          onClose={() => setOpen(false)}
          onSoldOut={() => {
            onSoldOutSize(size);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
