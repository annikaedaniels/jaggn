import { NextResponse } from "next/server";
import { upcomingShows } from "@/lib/tour";

// GET /api/tour → upcoming shows, sorted, past dates already dropped.
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect the latest edits

export async function GET() {
  try {
    return NextResponse.json({ shows: await upcomingShows() });
  } catch {
    return NextResponse.json({ shows: [] });
  }
}