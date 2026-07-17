"use client";

import { useEffect, useState } from "react";
import { EmailSignup } from "@/components/EmailSignup";
import { StaticField } from "@/components/StaticField";
import { useScrollLock } from "@/lib/useScrollLock";
import { site } from "@/data/site";

const KEY = "jaggn_exit_intent_until";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function isSuppressed() {
  try {
    return Date.now() < Number(localStorage.getItem(KEY) ?? 0);
  } catch {
    return false;
  }
}

function suppressFor30Days() {
  try {
    localStorage.setItem(KEY, String(Date.now() + THIRTY_DAYS));
  } catch {
    /* ignore private-mode storage errors */
  }
}

export function ExitIntent() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (isSuppressed()) return;

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      setOpen(true);
      cleanup();
    };

    // ── Desktop: cursor leaves the top of the viewport (back button / URL bar)
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) fire();
    };

    // ── Touch: there's no cursor to leave the window, so mouseleave never
    // fires — mobile visitors would never see this. The mobile equivalent of
    // "reaching for the back button" is a fast flick back up toward the top
    // of the page. We require real engagement first (scrolled a screen in)
    // so it can't ambush someone who just arrived.
    let lastY = window.scrollY;
    let lastT = Date.now();
    let engaged = false;

    const onScroll = () => {
      const y = window.scrollY;
      const t = Date.now();
      const dt = t - lastT || 1;
      const velocity = (y - lastY) / dt; // px per ms; negative = scrolling up

      if (y > window.innerHeight * 0.9) engaged = true;

      // Flicking up hard, and near the top again.
      if (engaged && velocity < -1.2 && y < window.innerHeight * 0.6) fire();

      lastY = y;
      lastT = t;
    };

    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    if (isTouch) {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      document.addEventListener("mouseleave", onLeave);
    }

    function cleanup() {
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  function close() {
    suppressFor30Days(); // closing OR submitting hides it for 30 days
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="pad-safe-x fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter"
    >
      <StaticField opacity={0.12} fps={14} tint={0.03} />
      <div
        className="relative z-10 w-full max-w-md border border-gray/25 bg-ink p-6 text-center sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="navlink tap absolute right-2 top-2 px-3"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="eyebrow mb-4 text-signal">{site.channel}</p>
        <h3 className="text-2xl text-gray sm:text-3xl">Before you go</h3>
        <p className="mx-auto mt-3 mb-6 max-w-xs font-sans text-sm text-grayDim">
          Get first word on drops, shows and the next transmission.
        </p>

        <EmailSignup compact onSuccess={close} />
      </div>
    </div>
  );
}
