"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

// When Stripe returns the buyer with ?session_id=..., verify the order
// server-side and report it through the top-right dialogs.
export function CheckoutReturn() {
  const { notify, update } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke in dev.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("session_id");
    if (!id) return;

    const toastId = notify({
      status: "pending",
      title: "Confirming order",
      detail: "Verifying payment with Stripe…",
    });

    (async () => {
      try {
        const res = await fetch(`/api/checkout-status?session_id=${id}`);
        const data = await res.json();

        if (data.status === "complete") {
          update(toastId, {
            status: "success",
            title: "Order confirmed",
            detail: data.email
              ? `Receipt sent to ${data.email}. Shipping is on us.`
              : "Receipt sent. Shipping is on us.",
            duration: 8000, // a purchase deserves a longer read
          });
        } else {
          update(toastId, {
            status: "error",
            title: "Payment incomplete",
            detail: "No charge was made. Try again.",
          });
        }
      } catch {
        update(toastId, {
          status: "error",
          title: "Couldn't confirm order",
          detail: "Check your email for a receipt.",
        });
      } finally {
        // Clean the URL so a refresh doesn't re-check.
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, [notify, update]);

  return null;
}
