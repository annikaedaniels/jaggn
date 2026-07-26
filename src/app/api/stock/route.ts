import { NextResponse } from "next/server";
import { remaining, stockEnabled } from "@/lib/stock";
import { products } from "@/data/site";

// GET /api/stock → { enabled, remaining: { [productId]: { S: n, M: n, ... } } }
// Lets each shirt section show "x left" / SOLD OUT per size without exposing anything.
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache a stock count

export async function GET() {
  if (!stockEnabled) {
    return NextResponse.json({ enabled: false, remaining: null });
  }
  try {
    const entries = await Promise.all(
      products.map(async (product) => {
        const sizeEntries = await Promise.all(
          product.sizes.map(async (size) => [size, await remaining(product.id, size)] as const),
        );
        return [product.id, Object.fromEntries(sizeEntries)] as const;
      }),
    );
    return NextResponse.json({
      enabled: true,
      remaining: Object.fromEntries(entries),
    });
  } catch {
    // Never break the page over a stock lookup — fall back to "just let them buy".
    return NextResponse.json({ enabled: false, remaining: null });
  }
}
