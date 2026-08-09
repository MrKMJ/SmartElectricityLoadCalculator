# Smart Energy Load Calculator

A home/property energy-management platform: appliance inventory, connected/running/peak/surge
load calculation, daily/monthly/annual consumption, electricity bill estimation, inverter/battery/
solar/generator sizing, essential-load backup planning, what-if scenarios, rule-based
recommendations, and downloadable PDF reports.

Built from `Architecture.docx` and `Features.txt` in this folder. It implements the **Phase 1 MVP**
scope those documents recommend building first, on the documented production stack (Next.js,
NestJS, PostgreSQL, Redis, S3-compatible object storage), with paid third-party integrations
(Stripe, OpenAI, OCR, Twilio, Sentry, PostHog) wired behind an abstraction layer as **mock
providers** so the whole app runs with zero paid API keys. Free/keyless integrations (Open-Meteo,
NREL PVWatts demo key) are wired for real.

## Architecture

```
apps/
  backend/     NestJS API — REST, JWT auth, Prisma/PostgreSQL, BullMQ/Redis, S3/MinIO
    src/common/calculation-engine/   the authoritative electrical formulas (pure, versioned,
                                      framework-agnostic — every module calls into this rather
                                      than reimplementing math)
    src/integrations/                abstraction layer over third-party APIs (real + mock providers)
    src/jobs/worker.main.ts          standalone background worker (PDF report generation)
  frontend/    Next.js 14 (App Router) — dashboard, appliances, calculator, sizing, bills,
               scenarios, reports, notifications
docker-compose.yml   local infra: PostgreSQL, Redis, MinIO (S3-compatible)
```

The key architectural decision (per `Architecture.docx`): **all electrical formulas live in one
Calculation Engine module**, never scattered across controllers. The API, and eventually any
mobile/report/IoT client, all share the same authoritative math. See
`apps/backend/src/common/calculation-engine/`.

### Implemented (Phase 1 MVP)

- Auth: register/login/refresh/logout, per-device sessions, RBAC (`USER`/`ADMIN`/`SUPER_ADMIN`)
- Projects (multi-property), project membership/sharing
- Appliance catalog (seeded, searchable) + per-project appliance inventory with catalog-snapshot
  semantics (editing the catalog later never silently changes a user's existing appliances)
- Load Calculator: connected/running load, daily/monthly/annual kWh
- Peak & Surge Load Analysis: 24-hour timeline model, peak demand, top contributors
- Electricity Bill Estimator: slab/tier tariff engine, historical bill snapshots
- Inverter/UPS, Battery, Solar, and Generator sizing engines
- Essential Load Selector (size backup around only what must stay on)
- What-If Scenarios: clone → modify → calculate → compare, without touching the real project
- Rule-based Recommendation engine (overload, undersized system, top-consumer, surge warnings)
- Async PDF Reports (BullMQ worker → PDF → MinIO → signed download URL)
- In-app Notifications
- Admin: user management, appliance/tariff catalog management, basic analytics, audit log
- **Load Scheduling**: assign a time window per appliance, hourly load chart with peak highlighted,
  and an optimizer that finds the biggest contributor to the daily peak and suggests moving it to
  the quietest hour (with an "Apply" button that writes the new schedule straight through)
- **Energy-Saving Center**: ranks appliances by % of monthly consumption, suggests efficient
  replacements (LED bulbs, inverter ACs, 5-star fridges, tankless water heaters, BLDC fans) with
  estimated kWh/cost savings, an efficiency score, and a what-if "simulate selected replacements"
  view showing projected consumption and bill
- **Project Sharing**: invite other registered users to a project as Viewer/Editor/Admin, change or
  revoke access
- **Installer/Professional accounts**: a cross-project "client" dashboard (`/installer`) listing
  every property you own or have been given access to, with owner contact info and the latest
  load/bill snapshot — visible in the nav for `PROFESSIONAL`/`INSTALLER`/`ADMIN`/`SUPER_ADMIN` roles
- **White-label branding + quotations**: save a company name, brand color, and logo
  (`/settings/branding`), then generate an itemized, branded PDF quotation for a client project
  (system-sizing summary + line items with costs) straight from the Reports page
- **Admin panel** (`/admin`, `ADMIN`/`SUPER_ADMIN` only): analytics overview, user role/status
  management, appliance-catalog CRUD, tariff CRUD — a frontend on top of the admin API routes that
  existed from Phase 1 but had no UI

### Stubbed / Phase 2+ (per the doc's own phased rollout)

Behind the `src/integrations/` abstraction so real credentials can be dropped in later without
touching business logic: Stripe subscriptions, OpenAI assistant, OCR nameplate scanning, Twilio
SMS, Sentry, PostHog. Not built: real-time smart-meter ingestion, installer portal, RLS.

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for PostgreSQL, Redis, MinIO)

## Setup

```bash
# 1. Start local infrastructure
docker compose up -d postgres redis minio

# 2. Backend
cd apps/backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev          # API on http://localhost:4000/api/v1, docs at /docs
```

In a second terminal, start the background worker (generates PDF reports — separate process so
it never blocks the API, per the doc):

```bash
cd apps/backend
npm run worker:dev
```

In a third terminal, the frontend:

```bash
cd apps/frontend
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Open http://localhost:3000, register an account (or sign in with the seeded demo admin:
`admin@example.com` / `ChangeMe123!`), create a property, add appliances, and run a calculation.

### ⚠️ Port note

`docker-compose.yml` maps PostgreSQL to **host port 5436**, not the default 5432. If this machine
already runs native PostgreSQL service(s) (common on dev machines with multiple installed
versions), they silently intercept 5432/5433/etc. and cause confusing `P1000 Authentication
failed` errors even though the Docker container itself is healthy. Check
`apps/backend/.env`'s `DATABASE_URL` matches whatever port `docker compose ps` shows if you ever
change the compose file.

## Environment variables

See `apps/backend/.env.example`. Everything works with the defaults except:

- `NREL_API_KEY` — defaults to the public `DEMO_KEY` (rate-limited but functional); get a free key
  at https://developer.nrel.gov for real usage.
- Paid integrations (`STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, etc.) — leave blank to use the mock
  providers (they log what they would have done and return realistic fake responses).

## Useful commands

| Command (from `apps/backend`) | What it does |
|---|---|
| `npm run start:dev` | API with hot reload |
| `npm run worker:dev` | Report-generation worker with hot reload |
| `npm run prisma:studio` | Browse the database |
| `npm run prisma:migrate` | Create/apply a new migration |
| `npm run seed` | Re-run the appliance/tariff/admin seed |

| Command (from `apps/frontend`) | What it does |
|---|---|
| `npm run dev` | Frontend with hot reload |
| `npm run build` | Production build (also type-checks) |

## API docs

Swagger UI is served at `http://localhost:4000/docs` while the backend is running.

## Notes on scope

This is a personal/local deployment of the Phase 1 MVP, not the full multi-tenant SaaS the
architecture doc sketches for later phases (subscriptions, installer portal, smart-meter
ingestion, AI/OCR). Those are intentionally left as mocked integration points rather than built
out, per the doc's own "don't implement all of the above simultaneously" guidance.
