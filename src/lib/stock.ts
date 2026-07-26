import { config, stockEnabled } from "@/lib/config";

export { stockEnabled };

// ─────────────────────────────────────────────────────────────
//  Shirt stock.
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
//  OPTIONAL: with no env vars set, stock is simply DISABLED and the shirt sells
//  without limit, exactly as before. Nothing breaks.
// ─────────────────────────────────────────────────────────────

const URL = config.redis.url;
const TOKEN = config.redis.token;
const INITIAL = config.shirtStock;

const STOCK_KEY = "jaggn:stock:shirt";
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

/** Seed the counter once, from SHIRT_STOCK. SETNX won't clobber a live count. */
export async function initStock() {
  if (!stockEnabled) return;
  await cmd("SETNX", STOCK_KEY, INITIAL!);
}

/** How many are left. null = limiting disabled. */
export async function remaining(): Promise<number | null> {
  if (!stockEnabled) return null;
  await initStock();
  const v = await cmd<string | null>("GET", STOCK_KEY);
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Try to claim one unit for this session.
 * Atomic: DECR returns the post-decrement value, so only one caller can take
 * the last shirt. If we went negative we hand it straight back.
 */
export async function reserve(sessionId: string): Promise<boolean> {
  if (!stockEnabled) return true;
  await initStock();

  const left = await cmd<number>("DECR", STOCK_KEY);
  if (left < 0) {
    await cmd("INCR", STOCK_KEY); // put it back — we oversold by one, undo
    return false;
  }

  await cmd("SETEX", seenKey(sessionId), SESSION_TTL, "reserved");
  return true;
}

/**
 * Payment went through. Stock was already decremented at reserve time, so this
 * only flips the marker. Idempotent: Stripe can deliver the same event twice.
 */
export async function commit(sessionId: string): Promise<void> {
  if (!stockEnabled) return;
  const prev = await cmd<string | null>("GETSET", seenKey(sessionId), "sold");
  await cmd("EXPIRE", seenKey(sessionId), SESSION_TTL);

  // Edge case: expired fired first (stock given back), then payment landed.
  // Take the unit back off the shelf.
  if (prev === "released") await cmd("DECR", STOCK_KEY);
}

/**
 * Session expired unpaid — put the shirt back.
 * GETSET is atomic, so a duplicate `expired` event can't refund stock twice:
 * only the caller that observed "reserved" performs the INCR.
 */
export async function release(sessionId: string): Promise<void> {
  if (!stockEnabled) return;
  const prev = await cmd<string | null>("GETSET", seenKey(sessionId), "released");
  await cmd("EXPIRE", seenKey(sessionId), SESSION_TTL);

  if (prev === "reserved") await cmd("INCR", STOCK_KEY);
}