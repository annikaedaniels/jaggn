import { config, stockEnabled } from "@/lib/config";

export { stockEnabled };

// ─────────────────────────────────────────────────────────────
//  Merch stock.
//
//  Stripe does NOT track stock. Its "limited inventory" guidance is about
//  expiring sessions so carts don't hold items — the counter is yours to own.
//  Stripe gives us the three hooks; this file is the counter.
//
//      reserve   on session create   (atomic DECR)
//      commit    on checkout.session.completed
//      release   on checkout.session.expired  (atomic INCR)
//
//  WHY A REDIS AND NOT A FILE
//  Serverless has no persistent disk — /tmp is wiped and every request may hit
//  a different instance. More importantly, preventing oversell REQUIRES an
//  atomic operation. Two buyers hitting Buy Now in the same millisecond must
//  not both read "1 left". `DECR` is atomic and returns the new value, so
//  exactly one of them can win. A read-then-write against any plain store
//  (a file, Stripe metadata, a JSON blob) has a race, and a race is precisely
//  what a merch drop is.
//
//  Uses Upstash's REST API over plain fetch — no SDK, and it works identically
//  on Netlify, Vercel and Cloudflare. Free tier is far more than a band needs.
//
//  OPTIONAL: with no env vars set, stock is simply DISABLED and everything
//  sells without limit, exactly as before. Nothing breaks.
//
//  MULTIPLE PRODUCTS: there can be more than one shirt (see data/site.ts'
//  `products` list). Every counter is keyed by BOTH product and size, so a
//  sellout of one product/size never touches any other.
// ─────────────────────────────────────────────────────────────

const URL = config.redis.url;
const TOKEN = config.redis.token;
const INITIAL = config.shirtStock; // initial count for EACH product × size

const stockKey = (productId: string, size: string) =>
  `jaggn:stock:${productId}:${size}`;
const seenKey = (sessionId: string) => `jaggn:session:${sessionId}`;
// Reservations self-clean after 24h in case a webhook is ever missed.
const SESSION_TTL = 60 * 60 * 24;

async function cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}

/** Seed one product/size counter, from SHIRT_STOCK. SETNX won't clobber a live count. */
export async function initStock(productId: string, size: string) {
  if (!stockEnabled) return;
  await cmd("SETNX", stockKey(productId, size), INITIAL!);
}

/** How many of this product/size are left. null = limiting disabled. */
export async function remaining(productId: string, size: string): Promise<number | null> {
  if (!stockEnabled) return null;
  await initStock(productId, size);
  const v = await cmd<string | null>("GET", stockKey(productId, size));
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Try to claim one unit of this product/size for this session.
 * Atomic: DECR returns the post-decrement value, so only one caller can take
 * the last one. If we went negative we hand it straight back.
 */
export async function reserve(
  sessionId: string,
  productId: string,
  size: string,
): Promise<boolean> {
  if (!stockEnabled) return true;
  await initStock(productId, size);

  const left = await cmd<number>("DECR", stockKey(productId, size));
  if (left < 0) {
    await cmd("INCR", stockKey(productId, size)); // put it back — oversold by one, undo
    return false;
  }

  await cmd("SETEX", seenKey(sessionId), SESSION_TTL, "reserved");
  return true;
}

/**
 * Payment went through. Stock was already decremented at reserve time, so this
 * only flips the marker. Idempotent: Stripe can deliver the same event twice.
 */
export async function commit(
  sessionId: string,
  productId: string,
  size: string,
): Promise<void> {
  if (!stockEnabled) return;
  const prev = await cmd<string | null>("GETSET", seenKey(sessionId), "sold");
  await cmd("EXPIRE", seenKey(sessionId), SESSION_TTL);

  // Edge case: expired fired first (stock given back), then payment landed.
  // Take the unit back off the shelf.
  if (prev === "released") await cmd("DECR", stockKey(productId, size));
}

/**
 * Session expired unpaid — put the item back.
 * GETSET is atomic, so a duplicate `expired` event can't refund stock twice:
 * only the caller that observed "reserved" performs the INCR.
 */
export async function release(
  sessionId: string,
  productId: string,
  size: string,
): Promise<void> {
  if (!stockEnabled) return;
  const prev = await cmd<string | null>("GETSET", seenKey(sessionId), "released");
  await cmd("EXPIRE", seenKey(sessionId), SESSION_TTL);

  if (prev === "reserved") await cmd("INCR", stockKey(productId, size));
}

/**
 * Directly overwrite one product/size's live count. Admin-only (guarded at
 * the route) — for correcting the count after an in-person sale, a restock,
 * etc. Unlike initStock this clobbers on purpose, so it only ever runs from
 * the admin panel, never from the buy flow.
 */
export async function setStock(productId: string, size: string, value: number): Promise<void> {
  if (!stockEnabled) {
    throw new Error("Stock storage is not configured (Upstash env vars unset).");
  }
  await cmd("SET", stockKey(productId, size), value);
}
