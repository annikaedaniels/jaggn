import Stripe from "stripe";
import { NextResponse } from "next/server";

// GET /api/checkout-status?session_id=... → { status, email }
// Used when Stripe returns the buyer to the site after payment.

const secretKey = process.env.STRIPE_SECRET_KEY;

export async function GET(request: Request) {
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });
  }

  const id = new URL(request.url).searchParams.get("session_id");
  if (!id) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    return NextResponse.json({
      status: session.status, // "complete" | "open" | "expired"
      paymentStatus: session.payment_status,
      email: session.customer_details?.email ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
}
