# Image plan — JAGGN

How art gets into the site, what to export, and the decisions already made.
Everything below is **already scaffolded**: each slot falls back to type or a
placeholder, so the site is complete today and images swap in without code
changes.

---

## 1. The white logo

**The problem, measured.** Against the `#0D0D0D` background:

| Element | Contrast |
|---|---|
| Pure white `#FFFFFF` | **19.4 : 1** |
| Site grey `#C2C5C1` | 11.2 : 1 |
| Signal orange `#FF5A00` | 6.2 : 1 |

Pure white is **1.81× the luminance** of the site's grey — it would be the
single brightest thing on the page, out-shouting even the orange accent. On a
site built from washed broadcast greys, a `#FFF` logo reads like a sticker
someone slapped on top: newer and cleaner than its surroundings. White also
isn't in the brief's palette at all (black / grey / 10% orange).

**The fix — no re-export needed.** The logo is masked and painted with
`currentColor` (`.logo-mask` in `globals.css`). CSS treats it as text: it
inherits grey, turns orange on hover like every other link, and one config flag
flips the whole site. So **send the logo pure white** — white-on-transparent is
the ideal master because the alpha channel is all the mask uses.

```ts
// src/data/site.ts
logoRecolor: true   // grey, orange on hover  ← default, recommended
logoRecolor: false  // burns pure white, as supplied
```

**One caveat:** masking uses alpha only, so it flattens any internal detail. For
a solid white logo that's exactly right. If the logo has shading, inner cutouts
with tone, or a second colour, tell me and I'll switch to a real `<img>` and
handle colour differently.

**Where white might still earn its place:** the boot sequence's "SIGNAL LOCKED"
moment. A signal snapping into focus *should* flare bright — that's the one spot
where white is diegetic rather than off-palette. Say the word and I'll wire it.

---

## 2. Where the logo goes

Mobile-first, since that's where space is tightest:

| Slot | Mobile | Desktop | Notes |
|---|---|---|---|
| **Header** | 18px tall, left | 22px, centred | Sits above the menu overlay; always visible |
| **Hero `<h1>`** | fluid `clamp(3rem, 11vw, 8rem)` | up to 8rem | The big moment. Replaces the Syne wordmark |
| **Mobile menu** | — | — | Deliberately none: the header logo already floats above the overlay. A second one would be redundant |
| **Boot sequence** | optional | optional | Currently "CHANNEL 7700" type. See white note above |
| **Favicon / OG** | required for launch | | See §3 |

The `<h1>` keeps the band name as real text (visually hidden) behind the image,
so search engines and screen readers still read "JAGGN". Losing that is the most
common way a logo swap quietly costs you SEO.

---

## 3. What to send

Drop files at these exact paths and they're live. **Bold = needed for launch.**

| # | File | Path | Format | Size | Notes |
|---|---|---|---|---|---|
| 1 | **Logo** | `/public/logo/jaggn.svg` | **SVG** preferred | any | White on transparent. PNG @3x (≥1200px wide) if no vector |
| 2 | **EP cover** | `/public/ep/channel-7700.jpg` | JPG/WebP | **1600×1600** | Square. Displays ≤384px CSS × 3 DPR = 1152 |
| 3 | **Shirt photo** | `/public/shirt/channel-7700-shirt.jpg` | JPG/WebP/PNG | **1600×1600** | See warning below |
| 4 | **OG image** | `/public/og.jpg` | JPG | **1200×630** | The link preview on IG/X/iMessage |
| 5 | Apple touch icon | `/public/apple-touch-icon.png` | PNG | 180×180 | Home-screen icon |
| 6 | Favicon | `/public/favicon.ico` | ICO/SVG | 64×64 | Placeholder exists |

**SVG is worth chasing for the logo.** It's a few KB, sharp on every phone at
every DPR (no 2x/3x exports), and scales to the hero without a second file.

> ### ⚠️ The shirt photo — the one that can wreck the page
> A product shot on a **white studio background** becomes a glaring white box on
> a `#0D0D0D` page — the brightest object on the site, sitting right next to your
> BUY NOW button. Ways out, best first:
> 1. **Cut out, transparent PNG** — the tee floats on the black. Cleanest.
> 2. **Shot on black / dark grey** — most on-brand.
> 3. Send it on white and I'll cut or tone it.
>
> Same logic for any band photos.

---

## 4. Mobile rules already handled

- **No layout shift.** Every image has explicit dimensions or a reserved
  aspect box, so nothing jumps as art loads — the fastest way to make a phone
  feel cheap.
- **Retina.** Phones run 3× DPR; the sizes above are ~3× their display size.
  Under-sending is what makes a logo look fuzzy on an iPhone.
- **Format/serving.** `next/image` auto-converts to WebP/AVIF and serves a
  per-device size — send the big master, not pre-shrunk copies.
- **LCP.** The EP cover is marked `priority` (it's the hero image); everything
  below the fold is lazy.
- **Grain lands on top.** The page-wide static (z-40) sits over all imagery, so
  art ties into the broadcast look automatically. At ~7% opacity it won't
  meaningfully dull a product photo.

---

## 5. Dropping them in

1. Copy files to the paths in §3 (EP cover and shirt keep their current
   filenames — pure swap, zero code).
2. For the logo, fill in the slot and give me its aspect ratio:

```ts
// src/data/site.ts
export const assets = {
  logo: { src: "/logo/jaggn.svg", aspect: 4.2 },  // aspect = width ÷ height
  logoRecolor: true,
};
```

`aspect` is what reserves the right space before the file loads. If you're
unsure, send the logo and I'll measure it.

3. Nothing else — the header, hero, and any future slot all read from there.
