import { NextResponse } from "next/server";
import { remaining, setStock, stockEnabled } from "@/lib/stock";
import { isAuthed, adminEnabled } from "@/lib/adminAuth";
import { products } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(request: Request): NextResponse | null {
  if (!adminEnabled) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD." },
      { status: 503 },
    );
  }
  if (!stockEnabled) {
    return NextResponse.json(
      { error: "Stock storage is not configured. Set the Upstash env vars." },
      { status: 503 },
    );
  }
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  return null;
}

// remaining() only returns null when stock storage is off, and guard() above
// already rejects that case, so the count is always a number by the time it
// gets here.
async function currentStock(): Promise<Record<string, Record<string, number>>> {
  const entries = await Promise.all(
    products.map(async (product) => {
      const sizeEntries = await Promise.all(
        product.sizes.map(async (size) => [size, (await remaining(product.id, size)) ?? 0] as const),
      );
      return [product.id, Object.fromEntries(sizeEntries)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// Live counts for every product × size, for the admin panel.
export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  return NextResponse.json({ stock: await currentStock() });
}

// Overwrite one or more product/size live counts.
export async function PUT(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const incoming = (body as { stock?: unknown })?.stock;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Expected a stock object." }, { status: 422 });
  }

  const updates: Array<[string, string, number]> = [];
  for (const product of products) {
    const forProduct = (incoming as Record<string, unknown>)[product.id];
    if (!forProduct || typeof forProduct !== "object") continue; // partial updates are fine

    for (const size of product.sizes) {
      const raw = (forProduct as Record<string, unknown>)[size];
      if (raw === undefined) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: `Invalid count for ${product.name} ${size}.` },
          { status: 422 },
        );
      }
      updates.push([product.id, size, Math.floor(n)]);
    }
  }

  await Promise.all(updates.map(([productId, size, n]) => setStock(productId, size, n)));
  return NextResponse.json({ ok: true, stock: await currentStock() });
}
