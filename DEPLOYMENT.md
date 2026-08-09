# Deploying to production

This deploys three pieces to three free/cheap platforms:

| Piece | Platform | Cost |
|---|---|---|
| API + background worker + PostgreSQL + Redis | [Railway](https://railway.app) | Free trial credit, then ~$5–10/mo for a hobby project |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Free (Hobby plan) |
| File storage (reports/PDFs) | [Cloudflare R2](https://dash.cloudflare.com) | Free tier (10GB storage, no egress fees) |

You'll do the account creation, billing, and dashboard clicking yourself in your own browser — I can't
sign up for services or enter payment details on your behalf. Everything below is exact steps + the
config files already committed to the repo.

**Total time: ~30–40 minutes**, mostly waiting for builds.

---

## 0. Push the code to GitHub

Railway and Vercel both deploy from a GitHub repo.

```bash
gh repo create smart-energy-load-calculator --private --source=. --remote=origin
git push -u origin main
```

Don't have `gh` (GitHub CLI)? Create a repo manually at https://github.com/new (don't initialize it
with a README), then:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

---

## 1. Cloudflare R2 (file storage)

1. Sign up / log in at https://dash.cloudflare.com → **R2 Object Storage** in the left sidebar.
2. **Create bucket** → name it `energy-app` (or anything — you'll set it as an env var either way).
   Location: Automatic.
3. Go to **R2 → Manage API Tokens → Create API Token**.
   - Permissions: **Object Read & Write**
   - Scope it to just the `energy-app` bucket if given the option.
   - Save the **Access Key ID** and **Secret Access Key** shown — R2 only shows the secret once.
4. Note your **Account ID** (shown on the R2 overview page, or in the URL). Your R2 endpoint is:
   ```
   https://<account-id>.r2.cloudflarestorage.com
   ```

You now have: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET=energy-app`.

---

## 2. Railway (API + worker + Postgres + Redis)

### 2.1 Create the project

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → pick your repo.
2. Railway will try to deploy the repo root — that's fine, you'll fix the root directory next.

### 2.2 Add PostgreSQL and Redis

1. In the project canvas, **+ New** → **Database** → **Add PostgreSQL**.
2. **+ New** → **Database** → **Add Redis**.
3. Click into each and copy the connection variable Railway generated — you'll reference these as
   `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` in the next step (Railway lets services
   reference each other's variables directly, no copy-pasting needed).

### 2.3 Configure the API service

Click the service Railway created from your repo (rename it "api" for clarity):

- **Settings → Root Directory**: `apps/backend`
- **Settings → Start Command**: leave blank (uses `railway.json`'s `npm run start:prod`, which runs
  pending migrations then starts the server)
- **Variables** — add these (Railway's variable picker lets you reference other services' vars):

  ```
  NODE_ENV=production
  PORT=4000
  API_PREFIX=api/v1
  FRONTEND_URL=https://REPLACE-ME.vercel.app
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  JWT_ACCESS_SECRET=<paste a generated secret — see below>
  JWT_REFRESH_SECRET=<paste a different generated secret>
  JWT_ACCESS_TTL=15m
  JWT_REFRESH_TTL=30d
  S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
  S3_REGION=auto
  S3_ACCESS_KEY=<from Cloudflare R2>
  S3_SECRET_KEY=<from Cloudflare R2>
  S3_BUCKET=energy-app
  S3_FORCE_PATH_STYLE=true
  NREL_API_KEY=DEMO_KEY
  OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
  ```

  You'll come back and fix `FRONTEND_URL` once you have the real Vercel URL in step 4.

  **Generate the two JWT secrets** locally (never reuse the dev defaults from `.env.example`):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  Run it twice, once for each secret.

- **Settings → Networking → Generate Domain** — this gives you the public API URL
  (`https://api-production-xxxx.up.railway.app`). Copy it, you need it for Vercel.

Railway auto-deploys on push. Watch the build logs; first deploy takes a few minutes (Nixpacks
detects Node, runs `npm install` → `postinstall` (`prisma generate`) → `npm run build` → your start
command, which runs `prisma migrate deploy` before booting the server).

### 2.4 Configure the worker service

The background worker (PDF report generation) needs to run as its **own** Railway service — it's a
long-running process with no HTTP server, not something the API service can also do.

1. In the same Railway project, **+ New** → **GitHub Repo** → the same repo again.
2. Rename it "worker".
3. **Settings → Root Directory**: `apps/backend`
4. **Settings → Start Command**: `npm run start:worker:prod` (this overrides `railway.json`)
5. **Settings → Networking**: leave it with no public domain — the worker doesn't serve HTTP.
6. **Variables**: same as the API service, minus `PORT`/`FRONTEND_URL`. Fastest way: open the API
   service's Variables tab → **Raw Editor** → copy → paste into the worker's Raw Editor → remove
   `PORT` and `FRONTEND_URL`.

### 2.5 Seed the database (once)

After the API service's first successful deploy, run the seed script once via Railway's CLI:

```bash
npm install -g @railway/cli
railway login
railway link          # pick this project
railway run --service api npm run seed:prod
```

This seeds the appliance catalog, a sample tariff, and the demo admin account
(`admin@example.com` / `ChangeMe123!` — **change this password after logging in once, live**).

---

## 3. Vercel (frontend)

1. https://vercel.com/new → import the same GitHub repo.
2. **Root Directory**: `apps/frontend` (Vercel will detect Next.js automatically once you set this).
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://api-production-xxxx.up.railway.app/api/v1
   ```
   (the Railway API domain from step 2.3, with `/api/v1` appended)
4. **Deploy**.

Once it's live, copy the Vercel URL (e.g. `https://smart-energy-load-calculator.vercel.app`).

---

## 4. Close the loop: fix CORS

Go back to Railway → **api** service → **Variables** → update:

```
FRONTEND_URL=https://smart-energy-load-calculator.vercel.app
```

Redeploy the api service (Railway does this automatically when a variable changes). Without this
step, the browser will block API calls from the deployed frontend with a CORS error — the backend
only allows the origins listed in `FRONTEND_URL`.

---

## 5. Verify

1. Open your Vercel URL. You should see the login page.
2. Register a new account, or sign in as the seeded admin.
3. Create a project, add an appliance, run a calculation — same flow as local dev.
4. Generate a report and confirm it completes (this exercises Railway ↔ Redis ↔ worker ↔ R2 all at
   once).

If a report gets stuck at `QUEUED`, the worker service isn't picking up jobs — check its Railway
logs; it's almost always a Redis connection var mismatch between the api and worker services.

---

## Notes

- **Swagger docs** (`/docs`) are intentionally disabled when `NODE_ENV=production` (see `main.ts`) —
  don't expose your full API schema publicly. Re-enable by removing that guard if you want them.
- **Custom domain**: both Railway and Vercel support adding your own domain under
  Settings → Domains on each service, once you're happy with the subdomain deployment.
- **Costs**: Railway's free trial credit runs out eventually; after that this stack (small Postgres +
  Redis + two small Node services) typically runs $5–10/mo. Vercel and R2 stay free at this scale.
- **Rotating secrets**: if a JWT secret or R2 key ever leaks, regenerate it and update the Railway
  variable — existing sessions signed with the old secret become invalid immediately (that's the
  point).
