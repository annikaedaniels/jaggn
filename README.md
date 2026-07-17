# JAGGN — Channel 7700

Single-page band site built with **Next.js (App Router)** + **TypeScript** +
**Tailwind**. One long scrollable page, minimal clicking, TV-static aesthetic,
Stripe checkout for the shirt, and Kit (ConvertKit) email capture.

---

## ⚠️ Security first — rotate your Stripe key

A **live Stripe secret key was shared in plain text** during this project's
creation. Treat it as compromised: in the Stripe Dashboard go to
**Developers → API keys → roll/regenerate** the secret key, then put the **new**
key only in `.env.local` (never in code, never in git).

This project never hardcodes the secret key. Checkout runs server-side and reads
`STRIPE_SECRET_KEY` from the environment. The publishable key
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is the only Stripe value exposed to the
browser — that's by design and is safe.

---

## Quick start

Requires Node 18.18+ (Node 20+ recommended).

```bash
npm install
cp .env.example .env.local     # then fill in your Stripe keys
npm run dev                    # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

## Open in VS Code

File → Open Folder → select `jaggn`. Accept the recommended extensions
(Tailwind IntelliSense, ESLint, Prettier), open a terminal, run the commands above.

---

## What's on the page (top to bottom)

1. **Floating nav** — `MUSIC · SHIRTS · LIVE · JAGGN (center logo) · CHANNEL 7700`.
   Links smooth-scroll the target section to the **center** of the viewport.
2. **Hero / Music** — big JAGGN, and **LISTEN NOW** buttons to Spotify, Apple
   Music, YouTube Music.
3. **Broadcast ticker** — scrolling "Channel 7700 / Now broadcasting".
4. **Shirts** — one product, **Free shipping** badge, **BUY NOW** opens the
   Stripe checkout overlay immediately.
5. **Live** — text-based dates. Shows the current date; if there are no upcoming
   shows it displays **EP IN DEVELOPMENT**.
6. **Footer** — email capture + Instagram / TikTok / YouTube / mail icons.
7. **Exit-intent overlay** — appears once when the mouse leaves toward the URL
   bar; closing or subscribing hides it for **30 days** (localStorage).

### Mobile

Built for phones from a folded Galaxy Fold (280px) up.

- **Navigation** — below `sm` (640px) the header is just **JAGGN + hamburger**;
  tapping opens a full-screen overlay with the three links in big Syne caps,
  live static + scanlines behind them, and the CHANNEL 7700 wordmark (which has
  no room in the phone header). From `sm` up, the inline links / logo / wordmark
  row returns. This follows the Citizen / Violent Vira mobile pattern.
- **Scrollspy** — the current section's link turns orange, in both the inline
  nav and the overlay. On one long page it's the only orientation cue.
- **Safe areas** — `viewport-fit=cover` + `env(safe-area-inset-*)` keep content
  clear of the notch, Dynamic Island, punch-hole and home indicator.
- **Touch targets** — 44px minimum (Apple HIG / Material) via the `.tap` class.

Mobile bugs this specifically fixes — all of which are easy to reintroduce:

| Problem | Fix |
|---|---|
| Header overflowed **every** phone (needed ~437px, iPhone 14 Pro Max is 430px) | hamburger below `sm` |
| iOS Safari crops `100vh` behind the address bar | `.h-screen-safe` (`100dvh` + `vh` fallback) |
| Tapping a link leaves it **stuck orange** (sticky hover) | `hoverOnlyWhenSupported` in `tailwind.config.ts` |
| iOS force-zooms on focusing an input under 16px | email input is 16px on mobile, `sm:text-sm` above |
| `overflow:hidden` doesn't lock scroll on iOS | `useScrollLock` pins the body and restores position |
| Exit-intent never fired on phones (`mouseleave` needs a cursor) | fast upward-flick detection after real engagement |
| Boot said "press any key" — phones have no keyboard | "Tap to skip" on coarse pointers |



### Transmission dialogs (top-right)

Any time data leaves the browser, a dialog opens in the top-right corner
(`Toast.tsx`, mounted once via `<ToastProvider>` in `layout.tsx`):

| Call | Pending | Resolves to |
|------|---------|-------------|
| Stripe session (`/api/checkout`) | "Contacting Stripe" | "Secure session open" / error |
| Order confirmation (`/api/checkout-status`) | "Confirming order" | "Order confirmed — receipt sent to …" / error |
| Kit subscribe (`/api/subscribe`) | "Sending to Kit" | "You're tuned in" / error |

Behavior: pending dialogs show a sweeping tuning bar and **stay until
resolved**; success auto-fades after **4s** (order confirmation gets 8s), errors
after 7s, each with a countdown bar. **Hovering holds a dialog open** so it can
be read, and every dialog has a close ✕. They stack, and sit above the checkout
overlay.

To add one to a new call:

```tsx
const { notify, update } = useToast();
const id = notify({ status: "pending", title: "Saving", detail: "…" });
update(id, { status: "success", title: "Saved" });   // or status: "error"
```

Durations live in `defaultDuration()`; position/width is the viewport `div` in
the same file. Errors announce via `role="alert"`, others via `role="status"`.

### Broadcast effects

- **Boot / tune-in sequence** (`BootSequence.tsx`) — on arrival the screen plays
  a dead channel: canvas snow → orange/grey/black test bars with flash frames and
  a VHS roll band → "SIGNAL LOCKED" → fade into the page (~2s).
  Click or press any key to skip. Plays **once per browser session**; set
  `REPLAY_EVERY_LOAD = true` in that file to always play. Timings are the
  `SNOW_END` / `BARS_END` / `LOCK_END` constants.
- **Persistent overlay** — full-page TV static + scanlines + CRT vignette, plus a
  scanline sweeping down the screen and a corner "REC · CH 7700" bug.
- **Static field** (`StaticField.tsx`) — low-opacity live snow for surfaces
  that sit *above* the page-wide `.tv-static` (z-40) and would otherwise cover
  it, e.g. the mobile menu. Runs only while mounted, throttles to ~14fps and
  pauses on tab-hide (a full-screen canvas repainting forever drains phone
  battery). Opacity is tuned to **0.14** — the noise averages toward mid-grey,
  so much past ~0.2 washes the black out and kills type contrast.
- **Static loading states** (`StaticLoader.tsx`) — the same live snow is reused
  wherever the page waits (e.g. while Stripe checkout opens), so loading looks
  like tuning rather than a generic spinner.
- **Two noise techniques, on purpose:** the always-on overlay uses cheap CSS
  grain (`.tv-static`), while the boot and loaders use real canvas noise
  (`src/lib/tvStatic.ts`) — randomized pixels blitted from a small buffer with
  smoothing off, so it looks like a CRT instead of photographic grain.

All animation respects `prefers-reduced-motion` (the boot is skipped entirely).

> **⚠️ Photosensitivity — read before changing the boot.**
> Large-area flashing above ~3 times per second can trigger seizures
> (WCAG 2.3.1). The flash frames are deliberately capped: `MAX_FLASHES = 3`,
> `FLASH_GAP_MS = 320`. As shipped the boot fires **2 flashes total**. Don't
> raise the cap or shorten the gap.

---

## Styling & configuration

All visual decisions live in two files — components carry classes, not values.

| Want to change | Edit |
|---|---|
| Colours (`ink` / `gray` / `grayDim` / `signal`) | `tailwind.config.ts` → `theme.extend.colors` |
| Letter-spacing | `tailwind.config.ts` → `letterSpacing`: `tracking-nav` (0.2rem), `tracking-label` (0.15rem), `tracking-input` (0.05rem) |
| Fonts | `src/app/layout.tsx` (`next/font`) + `fontFamily` in the config |
| Buttons / links / eyebrows | `.btn`, `.btn-solid`, `.navlink`, `.eyebrow` in `globals.css` |
| Static, scanlines, CRT vignette | `.tv-static`, `.menu-scan`, `.toast-scan`, `.crt-vignette` |
| Logo colour treatment | `.logo-mask` + `assets.logoRecolor` |
| Safe-area pins / dialog stack | `.pin-bl-safe`, `.pin-br-safe`, `.toast-viewport` |
| Touch targets | `.tap` (44px minimum) |

Every hover state is one rule (`hover:text-signal`, `.btn`), and
`hoverOnlyWhenSupported` compiles them behind `@media (hover: hover)` so touch
devices never get stuck in a hover state.

**Inline `style={}` is reserved for genuinely runtime values** — a toast's
countdown duration, the logo's `--logo-src`, a fade opacity driven by state.
Anything that's a *design decision* is a class, so it's tunable in one place
without hunting through TSX. (The audit moved 19 of 24 inline styles into
classes; the 5 that remain are all runtime-dynamic.)

### Reactive behaviour

- **Breakpoint**: `sm` (640px) is the mobile/desktop line — hamburger below,
  inline nav above. The menu auto-closes if the viewport crosses it (rotation,
  unfolding a foldable).
- **Media queries in JS** use `matchMedia` with change listeners, not one-shot
  width reads, so rotation and resizing are handled live.
- **Reduced motion** is honoured in CSS *and* in every canvas component.

## Performance notes (mobile)

Things deliberately done to keep phones smooth — worth knowing before changing:

- **Canvas sizing** uses `observeCanvasSize()` (`ResizeObserver` + one fit per
  animation frame). Never re-add `window.addEventListener("resize", fit)`:
  iOS fires a burst of resizes *mid-scroll* as the URL bar collapses, and each
  one reallocates the canvas buffer. `fitCanvas()` also no-ops when dimensions
  are unchanged.
- **Blend modes**: `.tv-static` drops `mix-blend-mode: screen` under 640px. On a
  fixed full-screen layer it forces the compositor to re-blend the whole page
  every frame; over a near-black page at 7% opacity it buys nothing.
- **Backdrop blur**: not used on the mobile menu — at `bg-ink/95` there's
  nothing to see through, so it'd be a full-screen filter for free.
- **Canvas frame rates**: the boot runs ~24fps, `StaticField` ~14fps and pauses
  on tab-hide. Grain doesn't need 60fps, and a full-screen canvas repainting
  forever is real battery drain.

## The shirt / Stripe checkout

- **Embedded** Stripe Checkout renders inside an overlay (`ui_mode: "embedded"`).
- Baked-in shipping: a **free shipping rate** is attached so the buyer sees
  shipping as **$0** — the cost is already inside the product price.
- `automatic_tax` is enabled.

IDs live in `src/data/site.ts` (these are **not** secret and are fine in code):

```
productId:       prod_UYR6Xo4bCIlh4b
priceId:         price_1TZKE7RgZ2vSyquERX2byw8G
shippingRateId:  shr_1TZKRwRgZ2vSyquEHateY9jT
```

Server logic is in `src/app/api/checkout/route.ts` and `checkout-status/route.ts`.
**`api/webhook/route.ts`** is the reliable fulfillment path — Stripe posts there
directly when a payment completes, so an order is never lost to a closed tab.
See DEPLOY.md for setup and the `STRIPE_WEBHOOK_SECRET` env var.
The **displayed** price is just a string in `site.ts`; the amount actually
charged is whatever the Stripe Price ID is set to. To ship internationally,
widen `shipping_address_collection.allowed_countries` in the checkout route
(and make sure your Stripe tax registrations cover those regions).

---

## Email (Kit / ConvertKit)

The custom-styled form posts to a small proxy at `src/app/api/subscribe/route.ts`,
which forwards to Kit's public form-subscription endpoint using your form uid
(`6d76d3becd`, set in `src/data/site.ts` as `KIT_FORM_UID`). No API key needed.

If you'd rather use Kit's official embed instead, drop this where you want it and
delete the custom form — the CSS in `globals.css` already restyles `.formkit-*`
to match:

```html
<script async data-uid="6d76d3becd" src="https://jaggn.kit.com/6d76d3becd/index.js"></script>
```

---

## Customize (edit `src/data/site.ts`)

| What | Where |
|------|-------|
| Band name, EP title, DSP links | `site.ep` |
| Shirt name, price text, blurb, Stripe IDs | `shirt` |
| Live dates (empty ⇒ "EP IN DEVELOPMENT") | `shows` |
| Instagram / TikTok / YouTube / email | `socials` |
| Kit form uid | `KIT_FORM_UID` |
| Colors + fonts | `tailwind.config.ts`, `src/app/layout.tsx` |

**Images:** replace the placeholders — same filenames, drop-in:
`public/ep/channel-7700.jpg` (EP artwork) and
`public/shirt/channel-7700-shirt.jpg` (product photo).

Fonts: **Syne** (headings) + **Inter** (nav/links, letter-spacing 0.2rem), both
loaded via `next/font`. Swap in `layout.tsx`.

---

## Deploy

Push to GitHub, import on **Vercel** (auto-detects Next.js). Add
`STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` as environment
variables in the Vercel dashboard. Set your production domain, and update the
Stripe checkout `return_url` origin if needed (it uses the request origin
automatically).
