// ─────────────────────────────────────────────────────────────
//  JAGGN — site content. Edit here to update the whole page.
// ─────────────────────────────────────────────────────────────

export const site = {
  band: "JAGGN",
  channel: "CHANNEL 7700",
  ep: {
    title: "Channel 7700 EP",
    cover: "/ep/channel-7700.jpg", // replace with your artwork (jpg/png/webp)
    // "LISTEN NOW" destinations:
    spotify:
      "https://open.spotify.com/album/6M2yVdJwjIOZy3xjiagsF7?si=_kg6D97xRxi64BmWmpnZeA",
    appleMusic: "https://music.apple.com/us/album/channel-7700-ep/1850151366",
    youtubeMusic:
      "https://www.youtube.com/watch?v=2KnHKOlGXVE&list=OLAK5uy_mTl-FUMZ733x97AuU3mrGK4wLogmUN5vc",
  },
} as const;

// Bottom-of-page icons (Citizen-style) + mail.
export const socials = {
  instagram: "https://www.instagram.com/jaggntheband/",
  tiktok: "https://www.tiktok.com/@jaggn_the_band",
  youtube: "https://www.youtube.com/@jaggnband",
  email: "mailto:hello@jaggn.com", // ← replace with the band's contact email
} as const;

// ── SHIRT ──────────────────────────────────────────────────────
// One product. Shipping is baked into the price; a free shipping rate
// is applied at checkout so the buyer sees shipping as $0.
// The Stripe IDs below are NOT secret and are safe to keep in code.
export const shirt = {
  name: "CHANNEL 7700 SHIRT",
  // Display price only — the amount actually charged is controlled by the
  // Stripe Price ID. Update this string to match your Stripe price.
  displayPrice: "$35",
  images: [
      { src: "/shirt/front.webp", label: "Front" },
      { src: "/shirt/back.webp", label: "Back" },
    ],  blurb: "Heavyweight tee. Free shipping — it's already in the price.",
  stripe: {
    productId: "prod_UYR6Xo4bCIlh4b",
    priceId: "price_1TZKE7RgZ2vSyquERX2byw8G",
    shippingRateId: "shr_1TZKRwRgZ2vSyquEHateY9jT",
  },
} as const;

// ── LIVE ───────────────────────────────────────────────────────
// If this list is empty (after filtering past dates), the LIVE section
// shows "EP IN DEVELOPMENT".
export type Show = {
  date: string;     // "MM.DD.YY" as displayed
  iso: string;      // ISO for sorting / past-date filtering
  city: string;
  state: string;
  venue: string;
  flyerUrl: string; // IG flyer post — opens in a new tab
};

export const shows: Show[] = [
  {
    date: "07.17.26",
    iso: "2026-07-17",
    city: "ORLANDO",
    state: "FL",
    venue: "TOUR LOCATION",
    flyerUrl: "https://www.instagram.com/jaggntheband/",
  },
];

// ── ASSETS ─────────────────────────────────────────────────────
// Drop files into /public and point these at them. Everything is null by
// default — each slot falls back to type, so the site works with no art.
// See IMAGES.md for formats, sizes and the white-logo treatment.
export const assets = {
  /**
   * Band logo. SVG strongly preferred; a transparent PNG @3x also works.
   * `aspect` = width ÷ height of the artwork — required, and it's what
   * reserves space so the page doesn't jump while the logo loads.
   * Example: { src: "/logo/jaggn.svg", aspect: 4.2 }
   */
  logo: { src: "/logo/jaggn.png", aspect: 0.848 } as null | {
    src: string;
    aspect: number;
  },

  /**
   * Recolor the logo to the site's grey (and orange on hover) instead of
   * letting it sit at pure white. See IMAGES.md — pure #FFF is brighter than
   * anything else in the palette. Only works for a solid/transparent logo.
   */
  logoRecolor: true,
  logoInNav: false,
} as const;

// Kit (ConvertKit) form uid from your embed snippet:
//   <script data-uid="6d76d3becd" src="https://jaggn.kit.com/6d76d3becd/index.js">
export const KIT_FORM_UID = "6d76d3becd";
