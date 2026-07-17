// Smoothly bring a section into the CENTER of the viewport (per brief).
export function scrollToCenter(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "center",
    inline: "nearest",
  });
}
