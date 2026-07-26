import { NextResponse } from "next/server";
import { readShows, writeShows, tourStoreEnabled } from "@/lib/tour";
import { isAuthed, adminEnabled } from "@/lib/adminAuth";
import type { Show } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(request: Request): NextResponse | null {
  if (!adminEnabled) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD." },
      { status: 503 },
    );
  }
  if (!tourStoreEnabled) {
    return NextResponse.json(
      { error: "Tour storage is not configured. Set the Upstash env vars." },
      { status: 503 },
    );
  }
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  return null;
}

// Full list, including past dates, for the editor.
export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const list = await readShows();
  return NextResponse.json({ shows: list });
}

// Derive display date "MM.DD.YY" from the ISO date, so the two never drift.
function toDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}.${d}.${y.slice(2)}`;
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Replace the whole list.
export async function PUT(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const incoming = (body as { shows?: unknown })?.shows;
  if (!Array.isArray(incoming)) {
    return NextResponse.json({ error: "Expected a shows array." }, { status: 422 });
  }

  const cleaned: Show[] = [];
  for (const raw of incoming) {
    const r = raw as Record<string, unknown>;
    const iso = clean(r.iso);
    // Require the essentials; skip anything malformed rather than store junk.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    const city = clean(r.city);
    const venue = clean(r.venue);
    if (!city || !venue) continue;

    cleaned.push({
      iso,
      date: toDisplay(iso),
      time: clean(r.time),
      city,
      state: clean(r.state),
      venue,
      flyerUrl: clean(r.flyerUrl),
    });
  }

  cleaned.sort((a, b) => a.iso.localeCompare(b.iso));
  await writeShows(cleaned);
  return NextResponse.json({ ok: true, shows: cleaned });
}