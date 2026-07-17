import { NextResponse } from "next/server";
import { KIT_FORM_UID } from "@/data/site";

// ─────────────────────────────────────────────────────────────
//  POST /api/subscribe  { email }
//  Proxies to Kit's public form-subscription endpoint — the same
//  one Kit's own embed posts to — so we can keep our custom styling
//  and avoid CORS. No API key required for public form submits.
//
//  If your form lives on a different host, change KIT_ENDPOINT.
// ─────────────────────────────────────────────────────────────

const KIT_ENDPOINT = `https://app.kit.com/forms/${KIT_FORM_UID}/subscriptions`;

function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.length <= 254
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: string };
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 422 });
  }

  try {
    const res = await fetch(KIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email_address: email.trim() }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Subscription service unavailable. Try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, message: "You're tuned in." });
  } catch {
    return NextResponse.json(
      { error: "Network error. Try again." },
      { status: 502 },
    );
  }
}
