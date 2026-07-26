// ─────────────────────────────────────────────────────────────
//  Central config — the ONE place the app reads environment variables.
//
//  Everything secret or deployment-specific (Stripe keys, the Upstash
//  database, the admin password, stock size) is surfaced here and imported
//  from here. Nothing elsewhere should call process.env directly, so there's
//  a single list of what this app consumes and a single place to change it.
//
//  Values still LIVE in the environment (.env.local locally, the host's
//  dashboard in production) — this module just reads and groups them. Nothing
//  sensitive is hardcoded; see .env.example for the full list.
//
//  NOTE ON THE BROWSER: only NEXT_PUBLIC_* vars are readable client-side, and
//  Next inlines them at build time. So the Stripe *publishable* key is exposed
//  here as `stripe.publishableKey` (safe — it's meant to be public), while the
//  secret key, DB token and admin password are only ever read in server code.
//  Never move a secret onto a NEXT_PUBLIC_ name.
// ─────────────────────────────────────────────────────────────

export const config = {
  stripe: {
    // Server-only. Used by the checkout / webhook / status routes.
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    // Safe to expose to the browser (that's its purpose).
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },

  // Upstash Redis (REST). Shared by stock + tour storage.
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  // Shirt run size PER SIZE (S/M/L/XL/XXL each get this many) — enables stock limiting when set.
  shirtStock: process.env.SHIRT_STOCK,

  // Password for /admin (tour editor). Server-only.
  adminPassword: process.env.ADMIN_PASSWORD,
} as const;

// ── Feature flags, derived once from the config above ──────────
// Each feature is simply "on" when the vars it needs are present, so the site
// degrades gracefully with nothing configured.

/** Stock limiting needs the DB and a run size. */
export const stockEnabled = Boolean(
  config.redis.url && config.redis.token && config.shirtStock,
);

/** Tour storage needs the DB (falls back to src/data/site.ts otherwise). */
export const redisEnabled = Boolean(config.redis.url && config.redis.token);

/** /admin needs a password. */
export const adminEnabled = Boolean(config.adminPassword);