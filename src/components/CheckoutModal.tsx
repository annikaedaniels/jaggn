"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { StaticLoader } from "@/components/StaticLoader";
import { useToast } from "@/components/Toast";
import { useScrollLock } from "@/lib/useScrollLock";

// Publishable key is safe to expose (that's its purpose). Add it to
// .env.local as NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (starts with pk_live_...).
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

export function CheckoutModal({
  onClose,
  onSoldOut,
}: {
  onClose: () => void;
  /** Fired when the last shirt went to someone else while this modal opened. */
  onSoldOut?: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { notify, update } = useToast();
  const started = useRef(false);

  // Ask our server for a session (the secret key never leaves the server).
  // We fetch it here rather than handing Stripe a fetcher, so we control the
  // loading state and can show the static while it resolves.
  //
  // The `started` ref guards against React StrictMode's dev double-invoke —
  // without it we'd open two Stripe sessions and two dialogs. We deliberately
  // do NOT abort on cleanup: StrictMode's throwaway unmount would cancel the
  // real request and hang the loader. A late setState after unmount is a
  // harmless no-op in React 18.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const id = notify({
      status: "pending",
      title: "Contacting Stripe",
      detail: "Opening a secure checkout session…",
    });

    (async () => {
      try {
        const res = await fetch("/api/checkout", { method: "POST" });
        const data = await res.json();
        if (data?.soldOut) {
          // Someone took the last one between the page loading and this click.
          update(id, {
            status: "error",
            title: "Sold out",
            detail: "The last one just went. Join the list for restocks.",
          });
          onSoldOut?.();
        } else if (!res.ok) {
          setError(data.error ?? "Couldn't start checkout.");
          update(id, {
            status: "error",
            title: "Checkout failed",
            detail: data.error ?? "Couldn't start checkout.",
          });
        } else if (!data?.clientSecret) {
          // A 200 with no secret would otherwise hang on the loader forever.
          setError("Checkout session was empty. Try again.");
          update(id, {
            status: "error",
            title: "Checkout failed",
            detail: "Stripe returned no session. Try again.",
          });
        } else {
          setClientSecret(data.clientSecret);
          update(id, {
            status: "success",
            title: "Secure session open",
            detail: "Card details go straight to Stripe.",
          });
        }
      } catch {
        setError("Network error. Try again.");
        update(id, {
          status: "error",
          title: "Connection failed",
          detail: "Couldn't reach Stripe. Try again.",
        });
      }
    })();
    // notify/update are stable (memoized in the provider)
  }, [notify, update, onSoldOut]);

  // Close on Escape.
  useScrollLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="pad-safe-top pad-safe-bottom fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      {/* Edge-to-edge sheet on phones (every px counts in a payment form);
          a floating panel from sm up. */}
      <div
        className="relative min-h-full w-full border-gray/25 bg-ink p-4 sm:my-8 sm:min-h-0 sm:max-w-xl sm:border sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow text-signal">Checkout · CH 7700</span>
          <button onClick={onClose} className="navlink" aria-label="Close checkout">
            Close ✕
          </button>
        </div>

        {!stripePromise ? (
          <div className="py-10 text-center font-sans text-sm text-grayDim">
            Checkout isn&apos;t configured yet. Add your Stripe publishable key
            (<span className="text-signal">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>)
            to <span className="text-signal">.env.local</span> and restart.
          </div>
        ) : error ? (
          <p
            className="py-10 text-center font-sans text-xs uppercase text-signal tracking-label"
          >
            {error}
          </p>
        ) : !clientSecret ? (
          <StaticLoader label="Opening checkout…" className="h-56" />
        ) : (
          <div className="bg-white">
            {/* Stripe renders its own themed form here */}
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
