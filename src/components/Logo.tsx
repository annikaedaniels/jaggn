import { assets, site } from "@/data/site";

// ─────────────────────────────────────────────────────────────
//  The band logo.
//
//  Renders the logo image when one is configured in `assets.logo`, and falls
//  back to the Syne wordmark otherwise — so the site looks finished with no
//  art at all, and dropping the file in swaps every instance at once.
//
//  WHITE LOGO HANDLING
//  The supplied logo is pure white (#FFFFFF). The palette's text colour is
//  #C2C5C1 — pure white is measurably brighter than anything else on the page
//  (≈19.6:1 contrast vs the greys' ≈12.6:1), so dropped in raw it reads like a
//  sticker rather than part of the broadcast.
//
//  Fix: mask the image and paint it with `currentColor`. The logo becomes
//  ordinary text as far as CSS is concerned — it inherits grey, turns orange
//  on hover like every other link, and needs no re-export to change colour.
//  This uses the alpha channel only, which is exactly right for a solid logo
//  (it would flatten any internal shading — see IMAGES.md).
//
//  Set `assets.logoRecolor = false` to let it burn pure white instead.
// ─────────────────────────────────────────────────────────────

export function Logo({
  /** rendered height in px; width follows from the artwork's aspect ratio */
  height,
  className = "",
}: {
  height: number;
  className?: string;
}) {
  const logo = assets.logo;

  // No art yet → the wordmark, as typed.
  if (!logo) {
    return <span className={className}>{site.band}</span>;
  }

  const width = Math.round(height * logo.aspect);

  // Recoloured: mask + currentColor, so it behaves like text.
  if (assets.logoRecolor) {
    return (
      <span
        role="img"
        aria-label={site.band}
        className={`logo-mask ${className}`}
        style={{
          height: `${height}px`,
          aspectRatio: String(logo.aspect),
          ["--logo-src" as string]: `url(${logo.src})`,
        }}
      />
    );
  }

  // Raw artwork, original colour.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={logo.src}
      alt={site.band}
      width={width}
      height={height}
      className={className}
      style={{ height: `${height}px`, width: "auto" }}
    />
  );
}
