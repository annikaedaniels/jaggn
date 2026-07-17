"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { site, assets } from "@/data/site";
import { scrollToCenter } from "@/lib/scroll";
import { useScrollLock } from "@/lib/useScrollLock";
import { StaticField } from "@/components/StaticField";
import { Logo } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";

const links = [
  { label: "Music", id: "music" },
  { label: "Shirts", id: "shirts" },
  { label: "Live", id: "live" },
];

// ─────────────────────────────────────────────────────────────
//  Floating nav.
//
//    < sm : JAGGN left, hamburger right → full-screen overlay menu
//           (the Citizen / Violent Vira pattern). Keeps the phone header
//           down to two elements so the page reads clean.
//    ≥ sm : links / logo / CHANNEL 7700 inline across three columns.
//
//  The overlay is where CHANNEL 7700 lives on mobile — the header has no
//  room for it, but the menu has room to spare.
// ─────────────────────────────────────────────────────────────

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("music");
  const reduce = useReducedMotion();

  const pending = useRef<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useScrollLock(open);

  function go(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (open) {
      // Defer the scroll until the menu has closed — see the effect below.
      pending.current = id;
      setOpen(false);
    } else {
      scrollToCenter(id);
    }
  }

  // Closing the menu unlocks body scroll, and the unlock restores the saved
  // scroll position. If we scrolled immediately on tap, that restore would
  // land AFTER us and yank the page back. Two frames lets the unlock finish
  // first, then we scroll.
  useEffect(() => {
    if (open || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => scrollToCenter(id));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  // Escape closes; focus moves into the menu on open and back to the button
  // on close, so keyboard and screen-reader users aren't stranded.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstLink.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  // Close the menu if the viewport grows past the mobile breakpoint while
  // it's open (rotation, or a foldable opening) — otherwise it'd stay
  // stuck over the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scrollspy — on a long single page the nav is the only orientation cue.
  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="pad-safe-top pad-safe-x pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="pointer-events-auto bg-ink">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1 sm:grid sm:grid-cols-3 sm:px-5 sm:py-2">
            {/* Logo — left on mobile, centered from sm up */}
            <a
              href="#top"
              onClick={(e) => go(e, "top")}
              className="tap order-1 text-gray transition-colors hover:text-signal sm:order-2 sm:justify-self-center"
              aria-label={`${site.band} — back to top`}
            >
              {/* Type by default — the crest is unreadable at this size.
                  Flip assets.logoInNav to swap it in. */}
              {assets.logoInNav ? (
                <>
                  <span className="sm:hidden">
                    <Logo height={24} />
                  </span>
                  <span className="hidden sm:inline">
                    <Logo height={28} />
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-xl uppercase sm:hidden">
                    {site.band}
                  </span>
                  <span className="hidden font-display text-2xl uppercase sm:inline">
                    {site.band}
                  </span>
                </>
              )}
            </a>

            {/* Inline links — sm and up only */}
            <ul className="order-2 hidden items-center gap-6 sm:order-1 sm:flex">
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    onClick={(e) => go(e, l.id)}
                    aria-current={active === l.id ? "true" : undefined}
                    className={`navlink tap ${active === l.id ? "!text-signal" : ""}`}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Channel wordmark — sm and up (mobile gets it in the menu) */}
            <span
              className="order-3 hidden justify-self-end font-sans text-xs uppercase text-signal sm:inline tracking-nav"
            >
              {site.channel}
            </span>

            {/* Hamburger — mobile only. Two bars that cross into an X. */}
            <button
              ref={menuButton}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="tap order-3 px-1 text-gray transition-colors hover:text-signal sm:hidden"
            >
              <span className="relative block h-4 w-6" aria-hidden>
                <span
                  className={`absolute left-0 h-[2px] w-6 bg-current transition-all duration-300 ${
                    open ? "top-[7px] rotate-45" : "top-[3px] rotate-0"
                  }`}
                />
                <span
                  className={`absolute left-0 h-[2px] w-6 bg-current transition-all duration-300 ${
                    open ? "top-[7px] -rotate-45" : "top-[11px] rotate-0"
                  }`}
                />
              </span>
            </button>
          </nav>
        </div>

        {/* Pinned under the nav, always visible. */}
        <div className="pointer-events-auto">
          <Ticker />
        </div>

        {/* Soft edge so the bar doesn't cut the page with a hard line. */}
        <div className="h-5 bg-gradient-to-b from-ink to-transparent" />
      </header>

      {/* ── Full-screen mobile menu ─────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="menu-scan pad-safe-top fixed inset-0 z-[45] flex flex-col items-center justify-center gap-2 overflow-hidden bg-ink/95 sm:hidden"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Live snow behind the menu. The page-wide .tv-static sits at
                z-40 — below this overlay — so without its own field the menu
                would be the one flat, dead surface on the site. */}
            <StaticField opacity={0.14} fps={14} tint={0.03} />

            <nav aria-label="Main" className="relative z-10">
              <ul className="flex flex-col items-center gap-1">
                {links.map((l, i) => (
                  <li key={l.id}>
                    <a
                      ref={i === 0 ? firstLink : undefined}
                      href={`#${l.id}`}
                      onClick={(e) => go(e, l.id)}
                      aria-current={active === l.id ? "true" : undefined}
                      className={`block px-6 py-3 font-display text-5xl uppercase transition-colors ${
                        active === l.id ? "text-signal" : "text-gray"
                      }`}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* The wordmark the header can't fit on a phone */}
            <span
              className="relative z-10 mt-10 font-sans text-[11px] uppercase text-signal tracking-nav"
            >
              {site.channel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
