import Stripe from "stripe";
import { NextResponse } from "next/server";
import { commit, release } from "@/lib/stock";

// ─────────────────────────────────────────────────────────────
//  POST /api/webhook — Stripe's server talking directly to ours.
//
//  WHY THIS EXISTS
//  The confirmation dialog on the site is driven by the browser coming back
//  to /?session_id=... after payment. That's cosmetic, and it's not guaranteed
//  to happen: tabs get closed, phones drop signal, browsers crash. Stripe is
//  explicit that fulfillment must never hang off that redirect.
//
//  This endpoint is the reliable path. Stripe POSTs here the moment a payment
//  completes — no browser involved — and retries for hours if we're down.
//
//  SECURITY: the signature check below is not optional. Without it this URL is
//  a public endpoint where anyone could POST a fake "order completed" and
//  trigger whatever fulfillment does.
// ─────────────────────────────────────────────────────────────

// The Stripe SDK is Node-only — it won't run on the Edge runtime.
export const runtime = "nodejs";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Do the actual work of an order. Must be safe to call MORE THAN ONCE for the
 * same session: Stripe retries on any non-2xx, and can deliver duplicates.
 *
 * Right now this only logs — Stripe's Dashboard is the order book, and Stripe
 * emails the buyer their receipt. Plug real work in here when you need it:
 *   • decrement shirt stock (the oversell risk in DEPLOY.md)
 *   • email the band a "new order" alert
 *   • push the buyer to the Kit list
 */
async function fulfillOrder(stripe: Stripe, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  // Unpaid sessions can complete (delayed payment methods). Don't ship those.
  if (session.payment_status === "unpaid") return;

  // ── TODO: fulfillment goes here ──
  console.log("[order]", {
    session: session.id,
    email: session.customer_details?.email,
    name: session.customer_details?.name,
    shipping: session.collected_information?.shipping_details?.address,
    total: session.amount_total,
    items: session.line_items?.data.map((li) => `${li.quantity}× ${li.description}`),
  });
}

export async function POST(request: Request) {
  if (!secretKey || !webhookSecret) {
    // 500 (not 200) so Stripe retries once the env vars are actually set.
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  // MUST be the raw body. request.json() would re-serialize it and the
  // signature would never match — the classic way this endpoint "mysteriously"
  // fails in production.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    // Bad signature = not from Stripe. Never process it.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Sale is final — the shirt stays off the shelf.
        await commit(session.id);
        await fulfillOrder(stripe, session.id);
        break;
      }
      case "checkout.session.expired": {
        // Buyer walked away (or lost the race). Put the shirt back on sale.
        const session = event.data.object as Stripe.Checkout.Session;
        await release(session.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Returning 500 makes Stripe retry with backoff — better than swallowing a
    // failed order.
    console.error("[webhook] fulfillment failed", err);
    return NextResponse.json({ error: "Fulfillment failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
