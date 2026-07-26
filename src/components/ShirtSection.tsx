"use client";

import { useEffect, useState } from "react";
import { products } from "@/data/site";
import { ShirtCard } from "@/components/ShirtCard";

export function ShirtSection() {
  // Per product, then per size. null = stock limiting is off (unlimited,
  // exactly as before) — see lib/stock.ts.
  const [stock, setStock] = useState<Record<string, Record<string, number>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stock");
        const data = await res.json();
        if (!cancelled && data?.enabled) setStock(data.remaining);
      } catch {
        /* stock is a nicety — never let it break the page */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="shirts" className="px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-8 text-center text-[13.2px] sm:mb-10">Shirts</p>

        <div className="flex flex-col gap-20">
          {products.map((product) => (
            <ShirtCard
              key={product.id}
              product={product}
              stock={stock ? stock[product.id] : null}
              onSoldOutSize={(size) =>
                setStock((prev) =>
                  prev
                    ? { ...prev, [product.id]: { ...prev[product.id], [size]: 0 } }
                    : prev,
                )
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
