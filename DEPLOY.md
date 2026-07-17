# Deploying JAGGN

## The mental model

There's **no server to keep alive**. You don't rent a machine, run `npm start`
in a terminal, and hope it stays up. Deploying does two things:

1. The page is **prerendered to static HTML at build time** (the `○` in the
   build table) and copied onto a CDN — a file on hundreds of edge servers
   worldwide. Serving it is the same work whether 1 or 10,000 people look.
2. The three `/api/*` routes become **serverless functions** — they don't run
   until someone clicks Buy Now or submits an email, then they wake, do their
   job in ~200ms, and sleep. You pay for invocations, not uptime.

Nothing idles, nothing crashes at 3am, nothing needs restarting. Push to
GitHub → the host rebuilds and redeploys automatically.

---

## ⚠️ Pick a host carefully — you're selling shirts

**Vercel's free "Hobby" plan forbids commercial use**, and they define it to
explicitly include *"any method of requesting or processing payment from
visitors of the site."* The day you switch on Stripe you're in violation, and
Vercel's terms let them pull the deployment without notice. Enforcement is
inconsistent, but don't build a merch drop on it.

| Host | Free tier OK for a store? | Next.js fit | Notes |
|---|---|---|---|
| **Vercel Pro** — $20/mo | ✅ (paid) | Perfect — same team builds Next.js | Zero config. What I'd pick |
| **Netlify** — free | ✅ commercial allowed | Very good (Next.js Runtime) | 100 GB/mo, 125k function calls. Sites *pause* if you blow the cap |
| **Cloudflare Pages** — free | ✅ commercial allowed | ⚠️ needs the OpenNext adapter | Unlimited bandwidth, cheapest at scale — but the adapter pushes toward the Edge runtime and the Stripe Node SDK in `api/checkout` may need rework |
| VPS (Hetzner etc.) | ✅ | Manual | ~$5/mo, but now you *do* babysit a server |

**Recommendation:** Netlify free to start (it's genuinely allowed, and 100 GB
is ~160,000 visits — see below). Vercel Pro if you want the smoothest path and
$20/mo is noise against merch revenue.

---

## Deploy in ~10 minutes

1. **Push to GitHub.** `git init && git add . && git commit -m "init"`, create a
   repo, push. `.gitignore` already excludes `.env.local` — your keys stay out.
2. **Import the repo** on Netlify/Vercel. Next.js is auto-detected; no build
   config to write.
3. **Add environment variables** in the dashboard (Settings → Environment
   Variables). This is the only manual step that matters:
   - `STRIPE_SECRET_KEY` — the **rotated** one (see README)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_live_…`
4. **Add the domain.** Buy `jaggn.com`, point its nameservers/DNS at the host,
   done — TLS certs are automatic and free.
5. Update `metadataBase` in `src/app/layout.tsx` to the real domain so link
   previews resolve correctly.

The Stripe `return_url` derives from the request origin, so it works on any
domain with no change.

---

## Before taking real money

- [ ] **Test with test keys first** (`sk_test_…` / `pk_test_…`) and card
      `4242 4242 4242 4242`. Do a full purchase on a phone.
- [ ] **Register your domain in Stripe** → Settings → Payment method domains.
      Apple Pay / Google Pay won't appear in embedded checkout until you do,
      and those are a large share of mobile conversions.
- [ ] Confirm the shipping rate shows **$0** and tax calculates.
- [ ] Check the order lands in the Stripe Dashboard.

### What happens if a buyer closes the tab mid-confirmation

Short version: **their money and their order are safe.** Longer version, because
the detail matters:

The confirmation dialog is driven by the browser returning to
`/?session_id=…` after payment. If that never happens — tab closed, signal
dropped, browser crashed — then:

| | |
|---|---|
| Was the card charged? | **Yes**, and correctly. Stripe processed it server-side |
| Is the order recorded? | **Yes** — full order + shipping address in your Stripe Dashboard |
| Does the buyer get a receipt? | **Yes**, from Stripe — *if* receipt emails are on (see below) |
| Do you know to ship it? | Yes, it's in the Dashboard |
| What's actually lost? | The on-site toast. Cosmetic |

So nobody is charged for nothing. But Stripe is blunt that you must never hang
fulfillment off that redirect — *"you can't rely on triggering fulfillment only
from your checkout landing page, because your customers aren't guaranteed to
visit that page."* Hence `/api/webhook`.

**`/api/webhook`** is the reliable path: Stripe POSTs it the instant a payment
completes, with no browser involved, and retries for hours if the site is down.
It verifies Stripe's signature (without that, anyone could POST a fake order),
and calls `fulfillOrder()` — currently just logging, since the Dashboard is your
order book. Plug stock decrements, band alerts, or Kit sync in there.

**Setting it up:**

1. Deploy, then Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://jaggn.com/api/webhook`
3. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`
4. Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` in your host's
   env vars
5. Locally: `stripe listen --forward-to localhost:3000/api/webhook`

**Do these two things regardless — they're zero code and cover you today:**

- **Turn on receipt emails**: Dashboard → Settings → Customer emails → *Successful
  payments*. This is the buyer's real safety net, not the toast. Without it, a
  buyer who closed the tab has no confirmation at all and may buy again.
- **Install the Stripe Dashboard app** and enable payment notifications. You get
  a push per sale — more reliable than any code, because it's Stripe's
  infrastructure, not yours.

### Shirt stock (optional, off by default)

**Stripe does not track inventory.** Its "limited inventory" docs are about
expiring sessions so carts don't *hold* items — the counter is yours. What
Stripe provides is the three hooks, and the site now uses all three:

| Moment | Stripe | Site |
|---|---|---|
| Buy Now clicked | session created with `expires_at` (30 min) | `reserve()` — atomic `DECR` |
| Payment succeeds | `checkout.session.completed` | `commit()` — shirt stays sold |
| Tab abandoned | `checkout.session.expired` | `release()` — shirt goes back on sale |

**Turn it on** (three env vars — leave them unset and the shirt sells without
limit, exactly as before):

1. Create a free database at [upstash.com](https://upstash.com) → copy the
   **REST** URL and token
2. Set on your host:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `SHIRT_STOCK=100` ← your run size
3. Make sure the webhook is live (above) — without it, abandoned carts never
   release their hold.

The count seeds once via `SETNX`, so redeploying won't reset a live run. To
restock, change the key in Upstash (not the env var — `SETNX` won't overwrite).

The site shows **"Only N left"** under 10, flips to **SOLD OUT** at zero
(greyed photo, disabled button, pointed at the mailing list), and if someone
takes the last one *while your checkout is opening*, you get a "Sold out"
dialog instead of a dead form.

#### Why Redis and not a file or Stripe metadata

Preventing oversell needs an **atomic** operation. Simulating 50 buyers hitting
Buy Now simultaneously on **1 shirt**:

| Counter | Result |
|---|---|
| Read → decide → write (file, Stripe metadata, JSON blob) | **sold 12** — oversold by 11 |
| Redis `DECR` (atomic) | **sold 1** — correct |

At 100 shirts / 400 buyers the naive version oversold by 17. The gap between
reading "1 left" and writing "0 left" is where a merch drop lives. `DECR` reads
and writes in one indivisible step and returns the new value, so exactly one
buyer can win. Upstash's REST API works identically on Netlify, Vercel and
Cloudflare, needs no SDK, and the free tier dwarfs what a band needs.

## Will it hold up for hundreds of people?

Yes — comfortably, and not because of anything clever. **Hundreds isn't a
scaling problem for a static page.**

Measured from the real build:

| | |
|---|---|
| First visit | **~640 KB** (HTML + 145 KB JS + fonts + 2 images as WebP) |
| Repeat visit | ~30 KB (cached) |
| 500 visits/mo | 0.31 GB |
| 5,000 visits/mo | 3.07 GB |
| 50,000 visits/mo | 30.7 GB |
| 100 GB free tier | **~160,000 first-time visits/mo** |

**Concurrency:** the homepage is a static file on a CDN. 100 simultaneous
visitors and 10,000 are the same work — the edge doesn't run your code, it
hands over a cached file. Serverless functions scale out automatically, and
only fire on a click.

**What would actually break first** — in order, and none of it is traffic:

1. **Your shirt stock** (see above). This is the real one.
2. **Stripe rate limits** — 100 requests/sec in live mode. That's ~100
   simultaneous checkout *opens per second*; a drop won't touch it.
3. **Bandwidth**, only if a video or huge images get added later. At 640 KB a
   visit you'd need ~160k visitors to hit the free cap.

The heavy-looking parts — TV static, boot sequence, canvas grain — all run on
the **visitor's device**, not your server. They cost you nothing at any scale.

**If you're expecting a spike** (a drop, a playlist add, a video going off):
nothing to do. That's the point of static + serverless. Just make sure you're
not on Vercel Hobby when it happens.
