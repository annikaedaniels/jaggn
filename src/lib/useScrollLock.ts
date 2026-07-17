"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────
//  Lock background scrolling while an overlay is open.
//
//  `body { overflow: hidden }` alone does NOT hold on iOS Safari — the page
//  still rubber-band scrolls behind the overlay, and closing it can leave you
//  somewhere else entirely. The reliable fix is to pin the body with
//  position: fixed at a negative offset, then restore the exact scroll
//  position on unlock.
// ─────────────────────────────────────────────────────────────

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      style.width = prev.width;
      style.overflow = prev.overflow;
      // Jump back without smooth-scrolling the whole way.
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [locked]);
}
