import Stripe from "stripe";
import { NextResponse } from "next/server";
import { products } from "@/data/site";
import { reserve, stockEnabled } from "@/lib/stock";

// ─────────────────────────────────────────────────────────────
//  POST /api/checkout  →  creates an EMBEDDED Checkout Session
//  and returns its client_secret for the overlay to mount.
//
//  SECURITY: the secret key is read ONLY from the environment
//  (server-side). It is never sent to the browser and never
//  committed. Put it in .env.local as STRIPE_SECRET_KEY.
// ─────────────────────────────────────────────────────────────

export const runtime = "nodejs";

import { config } from "@/lib/config";

const secretKey = config.stripe.secretKey;

// How long a buyer may hold an item before it goes back on sale.
const HOLD_MINUTES = 30;

export async function POST(request: Request) {
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local." },
      { status: 500 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // No body (or invalid JSON) — fall through, the checks below will reject it.
  }
  const productId = (body as { productId?: unknown })?.productId;
  const size = (body as { size?: unknown })?.size;

  const product = products.find((p) => p.id === productId);
  if (!product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (typeof size !== "string" || !(product.sizes as readonly string[]).includes(size)) {
    return NextResponse.json(
      { error: `Pick a size (${product.sizes.join(", ")}).` },
      { status: 400 },
    );
  }

  const stripe = new Stripe(secretKey);

  // Build return URL from the incoming request origin.
  const origin =
    request.headers.get("origin") ??
    new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [{ price: product.stripe.priceId, quantity: 1 }],

      // Free shipping rate → buyer sees shipping as $0 (cost is baked into price).
      shipping_options: [{ shipping_rate: product.stripe.shippingRateId }],

      // Required so automatic_tax and the shipping rate have an address.
      // Expand allowed_countries as you start shipping further out.
      shipping_address_collection: { allowed_countries: ["US"] },

      automatic_tax: { enabled: true },

      // Product + size aren't separate Stripe Prices — they ride along as
      // metadata so the webhook (and any refund/exchange later) knows which
      // stock bucket to touch.
      metadata: { productId: product.id, size },

      // Stock is held from the moment this session opens. Without an expiry, an
      // abandoned tab would hold an item hostage forever — so Stripe expires it
      // and fires checkout.session.expired, which releases the reservation.
      ...(stockEnabled
        ? { expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60 }
        : {}),

      // Stripe substitutes the real id into {CHECKOUT_SESSION_ID}.
      return_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Claim one unit of this product/size for this session. Done AFTER
    // creation because the reservation is keyed by session id — and it's
    // atomic, so if two buyers race for the last one, exactly one wins and
    // the loser's session is expired immediately rather than left open to
    // take money we can't honour.
    if (!(await reserve(session.id, product.id, size))) {
      await stripe.checkout.sessions.expire(session.id).catch(() => {});
      return NextResponse.json(
        { error: "Sold out.", soldOut: true },
        { status: 409 },
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
