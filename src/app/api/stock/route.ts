import { NextResponse } from "next/server";
import { remaining, stockEnabled } from "@/lib/stock";

// GET /api/stock → { enabled, remaining }
// Lets the shirt section show "x left" / SOLD OUT without exposing anything.
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache a stock count

export async function GET() {
  if (!stockEnabled) {
    return NextResponse.json({ enabled: false, remaining: null });
  }
  try {
    return NextResponse.json({ enabled: true, remaining: await remaining() });
  } catch {
    // Never break the page over a stock lookup — fall back to "just let them buy".
    return NextResponse.json({ enabled: false, remaining: null });
  }
}
