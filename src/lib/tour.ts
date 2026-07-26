import { shows as fallbackShows, type Show } from "@/data/site";
import { config, redisEnabled } from "@/lib/config";

// ─────────────────────────────────────────────────────────────
//  Tour dates — stored in Upstash (the same DB used for stock), so the
//  band can add/edit/remove shows from /admin without a code change or a
//  redeploy.
//
//  FALLBACK: if the DB isn't configured, or is empty, the public list falls
//  back to the shows hard-coded in src/data/site.ts. So the site always shows
//  something sensible, and turning the DB on is purely additive.
//
//  Storage shape: a single JSON blob under one key. A band has a handful of
//  shows, not thousands — one key is simpler than a row per show and avoids
//  any partial-write weirdness.
// ─────────────────────────────────────────────────────────────

// Tour storage rides on the shared Redis connection.
export const tourStoreEnabled = redisEnabled;

const URL = config.redis.url;
const TOKEN = config.redis.token;

const TOUR_KEY = "jaggn:tour:shows";

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

/** Read the raw stored list (unsorted, unfiltered). Falls back to site.ts. */
export async function readShows(): Promise<Show[]> {
  if (!tourStoreEnabled) return fallbackShows;
  try {
    const raw = await cmd<string | null>("GET", TOUR_KEY);
    if (!raw) return fallbackShows;
    const parsed = JSON.parse(raw) as Show[];
    return Array.isArray(parsed) ? parsed : fallbackShows;
  } catch {
    // Never let a storage hiccup blank the tour section.
    return fallbackShows;
  }
}

/** Overwrite the whole list. Admin-only (guarded at the route). */
export async function writeShows(list: Show[]): Promise<void> {
  if (!tourStoreEnabled) {
    throw new Error("Tour storage is not configured (Upstash env vars unset).");
  }
  await cmd("SET", TOUR_KEY, JSON.stringify(list));
}

/** Upcoming shows only, sorted — what the public page renders. */
export async function upcomingShows(): Promise<Show[]> {
  const today = new Date().toISOString().slice(0, 10);
  return (await readShows())
    .filter((s) => s.iso >= today)
    .sort((a, b) => a.iso.localeCompare(b.iso));
}