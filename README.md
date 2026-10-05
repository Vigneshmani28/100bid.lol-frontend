# 100BID

100BID is a marketplace of exactly 100 advertising spots. Anyone can claim an open spot or
outbid the current holder — highest bid wins, no accounts, no subscriptions, no refunds.

The homepage *is* the product: a 10×10 wall of spots, a claim/outbid flow (brand URL → preview →
email + bid → payment), and a private `/manage/<token>` link emailed after every successful bid.

## Architecture

```
100bid.lol/
├── app/                  Next.js App Router pages (frontend)
├── components/           React components
├── lib/                  Typed API client, money formatting, shared types
├── backend/              Express + Prisma + PostgreSQL API (separate service)
└── public/
```

**Frontend** — Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4. No
authentication — the UI talks to the backend purely over its public REST API using the typed
client in `lib/api.ts`.

**Backend** — Express + TypeScript + Prisma ORM + PostgreSQL, validated with Zod, tested with
Vitest (67 tests). Lives in `backend/` as an independently deployable service. See
`backend/src` for controllers/services/routes and `backend/prisma/schema.prisma` for the data
model.

Money is always handled as integer cents end-to-end (never floats) and only formatted to dollars
at render time (`lib/money.ts` on the frontend, `backend/src/lib/money.ts` on the backend — the
two are kept in sync byte-for-byte).

## How claiming a spot works

1. Pick an open (or occupied) spot on the wall.
2. Enter the brand's website URL — the backend fetches its title, description, and image
   server-side (with SSRF-safe URL validation) and shows a preview.
3. Enter an email address and a bid (minimum $1, must beat the current bid by at least $1).
4. Pay through the configured payment provider (a full mock provider ships for local dev — no
   credentials required).
5. On server-verified payment success, ownership transfers atomically. If someone else's bid was
   confirmed first, the payment is *not* refunded automatically (all sales are final) — the UI
   makes this explicit before and after payment.
6. A private management link (`/manage/<token>`) is emailed to the bidder. It's the only way to
   view or refresh that spot's brand details later — there's no login.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local install or Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env       # edit DATABASE_URL etc. if needed
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates the DB schema, generates the first migration
npm run seed                          # seeds all 100 empty slots (add --demo for sample ads)
npm run dev                           # starts the API on http://localhost:4000
```

Run `npm test` in `backend/` to run the test suite, `npm run typecheck` and `npm run lint` for
static checks.

### 2. Frontend

```bash
# from the repo root
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                   # starts the site on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000). With the backend running and seeded, the
wall loads all 100 spots immediately.

## Resetting the database

To wipe every row and start completely fresh (e.g. after clearing out old test data):

```bash
cd backend
npm run db:reset     # drops + recreates the schema via Prisma migrations, then reseeds (100 empty slots)
```

`db:reset` runs `prisma migrate reset --force` — it drops the database, reapplies every migration
from scratch, and runs `prisma/seed.ts` automatically. This is the recommended way to get a clean
slate; no manual SQL required.

If you'd rather keep the existing schema/migrations untouched and only empty the tables (e.g. no
`prisma` CLI access, connecting straight to Postgres), run the raw SQL script instead:

```bash
psql "$DATABASE_URL" -f backend/prisma/reset.sql
# or: npm run db:empty   (from backend/, uses $DATABASE_URL)
```

`backend/prisma/reset.sql` issues a single `TRUNCATE ... RESTART IDENTITY CASCADE` across all
tables — it empties every row without dropping or altering the schema. Reseed afterward with
`npm run seed` (or `npm run seed:demo` for a few sample listings).

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `4000`) |
| `APP_URL` | Public frontend URL, used to build management links |
| `CORS_ORIGIN` | Allowed origin for browser requests |
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYMENT_PROVIDER` | `mock` (default, no setup needed), `razorpay`, or `dodo` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Required only when `PAYMENT_PROVIDER=razorpay` |
| `DODO_MODE` / `DODO_API_KEY` / `DODO_WEBHOOK_SECRET` / `DODO_PRODUCT_ID` | Required only when `PAYMENT_PROVIDER=dodo` — see below |
| `EMAIL_PROVIDER` | `console` (default, logs emails to stdout), `resend` (recommended), or `gmail` |
| `EMAIL_API_KEY` / `EMAIL_FROM` | `EMAIL_API_KEY` required when `EMAIL_PROVIDER=resend` — see below |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Required only when `EMAIL_PROVIDER=gmail` — see below |
| `METADATA_FETCH_TIMEOUT` / `METADATA_MAX_RESPONSE_SIZE` | Optional overrides for the brand-metadata fetcher |
| `DATAFAST_API_KEY` | DataFast website-scoped API key (`df_...`), powers the `/admin` stats page — see below |
| `ADMIN_STATS_TOKEN` | Shared secret required to view `/admin` — see below |

Full defaults and comments live in `backend/.env.example`.

#### Setting up Dodo Payments

1. In the Dodo dashboard (test mode), create a one-time **product** with **Pay What You Want** enabled and a minimum price of $1 or less. Copy its product ID into `DODO_PRODUCT_ID`.
2. Copy your test-mode **API key** into `DODO_API_KEY`.
3. Under Webhooks, add an endpoint pointing at `<APP backend URL>/api/payments/webhook` (e.g. `http://localhost:4000/api/payments/webhook`, or a public tunnel URL in local dev) and copy its **signing secret** into `DODO_WEBHOOK_SECRET`.
4. Set `PAYMENT_PROVIDER=dodo` and leave `DODO_MODE=test` until you're ready to go live.
5. Restart the backend so the new env vars are picked up, then run through Claim → Pay in the UI — it redirects to Dodo's hosted checkout and back to `/?bid=<id>` when done.

#### Setting up email via Resend (recommended)

Sends from your own verified `100bid.lol` domain with proper SPF/DKIM records — the actual fix for mail landing in spam, not a workaround. Free tier covers 3,000 emails/month.

1. Sign up at [resend.com](https://resend.com) and go to **Domains → Add Domain**, enter `100bid.lol`.
2. Resend shows 2–3 DNS records (an MX and one or two TXT records for SPF/DKIM). Add them in GoDaddy under `100bid.lol` → DNS → Manage Zones — same place you added the A records pointing at your EC2 instance.
3. Wait for Resend's dashboard to show the domain as **Verified** (DNS propagation, usually minutes to a couple hours).
4. Go to **API Keys → Create API Key**, copy it into `EMAIL_API_KEY`.
5. Set `EMAIL_PROVIDER=resend`. `EMAIL_FROM` (`100BID <hello@100bid.lol>`) is sent as-is — no address substitution needed, since the domain itself is now authenticated.
6. Restart the backend.

#### Setting up email via Gmail

Works, but reliably lands in spam — a brand name sent from an unrelated `@gmail.com` address with no domain authentication behind it is exactly the pattern spam filters catch. Use Resend above instead unless you just need something working immediately.

1. On the Google Account that will send mail, turn on **2-Step Verification** (Security → 2-Step Verification) — required before Google will issue an app password at all.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create one named e.g. "100BID", and copy the 16-character password it shows (shown with spaces — the app strips them, so paste it either way).
3. Set `GMAIL_USER` to the full Gmail address, and `GMAIL_APP_PASSWORD` to that app password — not the account's normal login password, which Gmail's SMTP server will reject.
4. Set `EMAIL_PROVIDER=gmail`. `EMAIL_FROM`'s display name (e.g. `"100BID"` in `100BID <hello@100bid.lol>`) is kept, but the actual sending address is always `GMAIL_USER` — Gmail's SMTP server rejects a From address that isn't the authenticated mailbox or a verified "Send As" alias.
5. Restart the backend. Regular Gmail accounts are capped at roughly 500 sends/day — fine for transactional emails at this scale, but worth knowing if volume grows.

#### Viewing DataFast stats in the app

Two separate things, both backed by the same `DATAFAST_API_KEY` and neither ever exposing the `df_` key to the browser:

- **Live "N online" badge** in the site nav (`components/OnlineBadge.tsx`) — polls the public `GET /api/datafast/online` every 60s. No auth, since a visitor count isn't sensitive; the backend still holds the `df_` key server-side and just forwards the number.
- **`/admin` page** — the fuller traffic/revenue-attribution dashboard (visitors, sessions, payments, revenue, daily breakdown), gated by a shared secret since it exposes more than a headline count. Calls `GET /api/admin/datafast/stats` with an `x-admin-token` header.

Setup (covers both):

1. In the DataFast dashboard, go to **Settings → API keys** and create a website-scoped key (starts `df_`). Copy it into `DATAFAST_API_KEY`. This alone is enough to light up the nav badge.
2. If you also want `/admin`, generate a random secret for `ADMIN_STATS_TOKEN`, e.g. `openssl rand -hex 32`.
3. Restart the backend. The nav badge picks up automatically; for `/admin`, visit `<frontend URL>/admin` and enter the token when prompted — it's remembered in the browser after that (per browser, not shared).

### Frontend (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (default `http://localhost:4000/api`) |
| `NEXT_PUBLIC_DATAFAST_WEBSITE_ID` | DataFast website ID for analytics + revenue attribution. Baked into the JS bundle at build time — see the Dockerfile / DEPLOYMENT.md `--build-arg` note. |

## API reference

All endpoints are mounted under `/api` and return `{ success: true, data }` or
`{ success: false, error: { code, message } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/slots` | List all 100 spots with current occupancy/bid |
| GET | `/slots/:number` | One spot's detail + ownership history |
| POST | `/metadata/preview` | Fetch brand metadata for a website URL |
| POST | `/bids/prepare` | Reserve a bid amount ahead of payment |
| POST | `/payments/create` | Create a payment for a prepared bid |
| POST | `/payments/webhook` | Provider webhook (signature-verified, raw body) |
| POST | `/payments/mock/:orderId/complete` | Complete a mock payment (dev only) |
| GET | `/admin/datafast/stats` | DataFast overview + timeseries (requires `x-admin-token` header) |
| GET | `/datafast/online` | Live visitor count for the nav badge (public) |
| GET | `/manage/:token` | Fetch a spot's management view |
| POST | `/manage/:token/refresh-metadata` | Re-fetch brand metadata for an owned spot |
| POST | `/reports` | Report a spot (abuse/moderation) |

## Production build

```bash
# backend
cd backend && npm run build && npm start

# frontend
npm run build && npm start
```

Frontend production builds are static/edge-optimized where possible — the wall page and manage
page share the same typed API client, and OG/Twitter share images are generated at build time
(`app/opengraph-image.tsx`) with no external network dependency.

## Notes on this build

- Fonts are self-hosted via the `geist` npm package rather than `next/font/google`, so the
  frontend has no external font-CDN dependency at build or runtime.
- Favicon and OG image are generated from code (SVG favicon, programmatic OG image) — no binary
  image assets are checked in.
- The backend's Prisma client and its query engine binary are downloaded on first
  `npm install` / `prisma generate` against `binaries.prisma.sh`; make sure that host is
  reachable from wherever you run this (it's a standard public CDN — only relevant if you're
  behind a restrictive network/proxy).
# 100bid.lol-frontend
