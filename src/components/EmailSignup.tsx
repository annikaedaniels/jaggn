"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export function EmailSignup({
  onSuccess,
  compact = false,
}: {
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify, update } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Feedback lives in the top-right dialogs so the exit-intent overlay
    // can close on success without swallowing the confirmation.
    const id = notify({
      status: "pending",
      title: "Sending to Kit",
      detail: `Adding ${email} to the list…`,
    });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        update(id, {
          status: "success",
          title: "You're tuned in",
          detail: "You'll hear it here first.",
        });
        setEmail("");
        onSuccess?.();
      } else {
        update(id, {
          status: "error",
          title: "Signup failed",
          detail: data.error ?? "Something went wrong.",
        });
      }
    } catch {
      update(id, {
        status: "error",
        title: "Connection failed",
        detail: "Network error. Try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "" : "mx-auto max-w-md"}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email"
          // Mobile keyboard hints: email pad, no autocaps/autocorrect mangling.
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          // 16px minimum on phones — iOS Safari force-zooms the page on focus
          // for any input under 16px, which yanks the layout sideways.
          className="w-full border border-gray/40 bg-transparent px-4 py-3 font-sans text-base text-gray placeholder:text-grayDim/70 focus:border-signal sm:text-sm tracking-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn btn-solid shrink-0 disabled:opacity-50"
        >
          {loading ? "…" : "Tune in"}
        </button>
      </div>
    </form>
  );
}
