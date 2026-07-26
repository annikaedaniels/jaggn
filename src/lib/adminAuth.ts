import { timingSafeEqual } from "crypto";
import { config, adminEnabled } from "@/lib/config";

export { adminEnabled };

// ─────────────────────────────────────────────────────────────
//  Admin auth — a single shared password in ADMIN_PASSWORD.
//
//  Not a user system, just a gate so /admin (which writes to the live DB)
//  isn't open to anyone who guesses the URL. The password is sent in an
//  Authorization header and compared server-side in constant time, so it
//  never ships to the browser bundle and the check can't be timing-probed.
// ─────────────────────────────────────────────────────────────

const PASSWORD = config.adminPassword;

/** True if the request carries the correct admin password. */
export function isAuthed(request: Request): boolean {
  if (!PASSWORD) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");
  if (!provided) return false;

  // Constant-time compare. Both sides must be equal length for timingSafeEqual,
  // so hash-length-normalize by encoding first and length-checking up front.
  const a = Buffer.from(provided);
  const b = Buffer.from(PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}