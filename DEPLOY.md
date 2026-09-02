# Tagzheimer — Deployment Guide (v3 — Supabase edition)

This document covers deploying the full Tagzheimer stack to production: backend, frontend, mobile app, and firmware.

> **Runtime:** Backend + frontend use **Bun** (faster installs, smaller Docker images). Mobile app uses **npm** (Expo has rough edges with Bun). Install Bun: `curl -fsSL https://bun.sh/install | bash`.
>
> **Database + Auth:** Handled by [Supabase](https://supabase.com) — Postgres + Auth + RLS. No MongoDB or Firebase. Free tier covers ~500 MB DB + 50,000 MAU auth.

The system has four parts:

| Part | Tech | Deploy target |
|------|------|----------------|
| Backend | Bun + Express + Supabase JS client | Docker, Fly.io, Railway, Render, any VPS |
| Frontend | Vite + React + Tailwind (SPA) + Supabase JS | Vercel, Netlify, Cloudflare Pages, any static host |
| Mobile | Expo + React Native (Android) | EAS Build → APK / AAB for sideloading or Play Store |
| Firmware | Arduino IDE (ESP32-WROVER + NEO-6M) | Flash directly to the ESP32 |
| Database + Auth | **Supabase** (Postgres + Auth + RLS) | Supabase free tier |

Pick a deployment target for each:

---

## Supabase setup (10 min, one-time, required for production)

Supabase handles **both** the database (Postgres) and auth (email/password + OAuth). Free tier covers ~500 MB DB + 50,000 monthly active users.

### 1. Create a project

1. Go to https://supabase.com → **Start your project**
2. Organization → **New project**
3. Name: `tagzheimer` (or anything)
4. Database Password: generate a strong one — **save it**, you can't recover it later
5. Region: closest to your users (e.g. `US East (N. Virginia)` or `EU Central (Frankfurt)`)
6. Plan: **Free**
7. Click **Create new project** (~3 min to provision)

### 2. Apply the schema

1. In the Supabase dashboard, click **SQL Editor** (left sidebar) → **New Query**
2. Open `backend/supabase/schema.sql` from this repo, copy the entire contents
3. Paste into the SQL editor → **Run** (or `Ctrl+Enter`)
4. You should see "Success. No rows returned." — tables + triggers + RLS policies are now set up

### 3. Get your API credentials

In the Supabase dashboard → **Project Settings** (gear icon, bottom left) → **API**:

| Value | What it's used for | Where to put it |
|-------|---------------------|----------------|
| **Project URL** | e.g. `https://tagzheimer.supabase.co` | `SUPABASE_URL` (backend) + `VITE_SUPABASE_URL` (frontend) |
| **anon public** key | Browser-safe, RLS-protected | `SUPABASE_ANON_KEY` (backend) + `VITE_SUPABASE_ANON_KEY` (frontend) |
| **service_role** key | Backend only — bypasses RLS | `SUPABASE_SERVICE_KEY` (backend only — NEVER in frontend) |
| **JWT Secret** (under "JWT Settings") | Used by backend to verify user JWTs | `SUPABASE_JWT_SECRET` (backend only) |

### 4. (Optional) Set up email auth

1. **Authentication** (left sidebar) → **Providers** → **Email** (should be enabled by default)
2. Configure:
   - **Confirm email**: ON for production, OFF for testing
   - **Email OTP expiry**: 3600 (1 hour, default)
3. **Users** → **Add user** → manually create your first caregiver account if you want to skip the email confirmation flow

### 5. Seed demo data (optional)

After signing up your first user via the frontend, replace `<demo-user-uuid>` at the bottom of `schema.sql` with the user's `id` (visible in Authentication → Users) and run just the INSERT block to seed 4 demo devices.

---

## Quick start — local Docker stack (5 minutes, no cloud)

Fastest way to run everything on your dev machine:

```bash
git clone https://github.com/Tagzheimer/Tagzheimer.git
cd Tagzheimer
cp .env.example .env
# Edit .env: set JWT_SECRET (`openssl rand -hex 32`) + SUPABASE_URL /
# SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY / SUPABASE_JWT_SECRET
# (docker-compose refuses to start without them)
make docker-up
```

Open:
- **Frontend:** http://localhost:8080
- **Backend health:** http://localhost:5000/api/health
- **Supabase:** hosted at your project URL (e.g. `https://tagzheimer.supabase.co`)

Or use the interactive picker:

```bash
bash deploy.sh    # follow the prompts (pick 1 for the local Docker stack)
```

To stop: `make docker-down`. To wipe all data: `make docker-clean` (removes the compose stack's containers).

> Note: there is **no MongoDB container** in the v3 stack — Supabase is the database (hosted). The local Docker stack runs backend + frontend only.

---

## Production deployments

### Backend — Fly.io (recommended)

Fly.io gives you a single-command deploy with a generous free tier.

```bash
# 1. Install fly CLI
curl -L https://fly.io/fly-install.sh | sh

# 2. Auth
fly auth login

# 3. From the project root:
cd backend
fly launch --no-deploy --name tagzheimer-backend

# 4. Set secrets — Supabase credentials (see "Supabase setup" above)
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set SUPABASE_URL="https://tagzheimer.supabase.co"
fly secrets set SUPABASE_ANON_KEY="eyJhbGc..."        # anon public
fly secrets set SUPABASE_SERVICE_KEY="eyJhbGc..."     # service_role (backend-only!)
fly secrets set SUPABASE_JWT_SECRET="your-jwt-secret"
fly secrets set CLIENT_URL="https://app.tagzheimer.com"

# 5. Deploy
fly deploy
```

After deploy: backend URL = `https://tagzheimer-backend.fly.dev`.

### Backend — Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set env vars via the Railway dashboard → Variables tab (same set as Fly.io):

- `JWT_SECRET` ← `openssl rand -hex 32`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
- `CLIENT_URL`

No database plugin needed — the database lives in Supabase (see "Supabase setup" above).

### Backend — Render

1. Push your repo to GitHub
2. render.com → New → Web Service → connect repo
3. Pick the `backend/Dockerfile` build
4. Add environment variables in the Render dashboard:
   - `JWT_SECRET`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
   - `CLIENT_URL` (frontend URL for CORS)
5. Render builds and deploys

### Backend — any VPS with Docker

```bash
# On the server:
docker pull tagzheimer/backend:latest
docker run -d --name tagz-backend \
  -p 5000:5000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e SUPABASE_URL="https://tagzheimer.supabase.co" \
  -e SUPABASE_SERVICE_KEY="eyJhbGc..." \
  -e SUPABASE_JWT_SECRET="your-jwt-secret" \
  -e CLIENT_URL="https://app.tagzheimer.com" \
  --restart unless-stopped \
  tagzheimer/backend:latest
```

Put behind a reverse proxy (Caddy, Traefik, nginx) for TLS.

### Frontend — Vercel (recommended)

```bash
cd frontend
npx vercel
```

Or via the dashboard:
1. Push repo to GitHub
2. vercel.com → New Project → import repo
3. **Framework preset:** Vite
4. **Root directory:** `frontend`
5. **Build command:** `npm run build`
6. **Output directory:** `dist`
7. **Environment variables:** `VITE_API_URL` = your backend URL (e.g. `https://tagzheimer-backend.fly.dev`)

Caregivers can also override the backend URL at runtime via **Profile → Backend Settings**.

### Frontend — Netlify

```bash
cd frontend
npx netlify deploy --prod
```

Or use the dashboard + the included `netlify.toml` config — just connect the repo and Netlify will detect the rest. Set `VITE_API_URL` in Site settings → Environment variables.

### Frontend — Cloudflare Pages

```bash
cd frontend
npx wrangler pages deploy dist --project-name tagzheimer
```

### Frontend — via Docker

The included `frontend/Dockerfile` builds a static nginx-served image. Useful for self-hosting alongside the backend:

```bash
docker build -t tagzheimer/frontend --build-arg VITE_API_URL=https://api.tagzheimer.com frontend/
docker run -d -p 8080:80 --restart unless-stopped tagzheimer/frontend
```

### Mobile app — EAS Build (recommended)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure

# Build an APK for sideloading (fast, ~10 min)
eas build --platform android --profile preview

# Build an AAB for the Play Store
eas build --platform android --profile production

# Submit to the Play Store (one-time Google service account setup)
eas submit --platform android --profile production
```

For a local APK build (no EAS account, requires Android Studio + JDK 17):

```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Firmware — direct flash

The firmware doesn't need deployment in the cloud sense — flash it directly to the ESP32:

1. Open `firmware/src/tagzheimer_firmware.ino` in Arduino IDE
2. Install libraries: **TinyGPSPlus**, **ArduinoJson** (via Library Manager)
3. Copy `firmware/src/secrets.example.h` → `firmware/src/secrets.h`, fill in WiFi creds
4. Edit `firmware/src/config.h`:
   - `SERIAL_NUMBER` — match a device registered in the backend
   - `BACKEND_URL` — your deployed backend URL
5. Select board: **ESP32 Wrover Kit**
6. Upload

On first boot, the firmware calls `POST /api/devices/pair` with `SERIAL_NUMBER`, stores the returned access token in NVS, then starts sending GPS fixes every `UPDATE_INTERVAL_SECONDS`.

---

## Putting it all together — recommended production setup

| Part | Hosted on | URL |
|------|-----------|-----|
| Frontend | Vercel | `https://app.tagzheimer.com` |
| Backend | Fly.io | `https://api.tagzheimer.com` |
| Database + Auth | Supabase (free tier) | `https://tagzheimer.supabase.co` |
| Mobile app | EAS → Play Store (internal track) | sideloaded APK initially |
| ESP32 firmware | Your local machine | Arduino IDE → USB cable → ESP32 |

DNS: point `app.tagzheimer.com` and `api.tagzheimer.com` A records at Vercel + Fly respectively. Both handle TLS automatically.

CORS: set `CLIENT_URL=https://app.tagzheimer.com` on the backend so it accepts requests from the frontend.

Frontend env: set `VITE_API_URL=https://api.tagzheimer.com` at build time. Caregivers can still override at runtime via Profile → Backend Settings.

---

## Environment variables — full reference

### Backend

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | no | `5000` | HTTP port |
| `NODE_ENV` | no | — | `production` enables strict mode |
| `JWT_SECRET` | **yes (prod)** | dev fallback | Signs device JWTs (firmware + mobile app pairing) |
| `SUPABASE_URL` | **yes (prod)** | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | **yes (prod)** | — | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_KEY` | **yes (prod)** | — | Supabase service-role key (backend only) |
| `SUPABASE_JWT_SECRET` | **yes (prod)** | — | Used to verify user JWTs |
| `DEMO_MODE` | no | `false` | `true` skips Supabase, uses in-memory store |
| `CLIENT_URL` | no | `http://localhost:5173` | CORS origin |

### Frontend (build-time, prefix `VITE_`)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_URL` | no | empty (uses /api proxy in dev) | Backend URL for production builds |
| `VITE_DEV_BACKEND` | no | `http://localhost:5000` | Dev-only: backend target for the /api proxy |
| `VITE_SUPABASE_URL` | **yes (prod)** | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **yes (prod)** | — | Supabase anon key (browser-safe) |

Caregivers can override `VITE_API_URL` at runtime via Profile → Backend Settings (stored in localStorage).

### Mobile

No env vars. Backend URL is entered at pairing time and persisted in `AsyncStorage` + `SecureStore`.

### Firmware

Edit `firmware/src/config.h`:
- `BACKEND_URL` — your deployed backend URL
- `SERIAL_NUMBER` — match a registered device
- `WIFI_SSID` / `WIFI_PASSWORD` in `secrets.h`
- `UPDATE_INTERVAL_SECONDS` — default 300 (5 min)
- `ENABLE_DEEP_SLEEP` — `1` for battery operation

---

## Health check & monitoring

The backend exposes `GET /api/health` returning:

```json
{
  "success": true,
  "message": "Tagzheimer API is running",
  "version": "3.0.0",
  "mode": "production",
  "timestamp": "2026-08-20T..."
}
```

The Dockerfile wires this into a Docker `HEALTHCHECK` (every 30s). Fly / Railway / Render / k8s all support health checks — point them at this endpoint.

For uptime monitoring: hook UptimeRobot (free) or Pingdom to `/api/health`.

---

## Backups

**Supabase:** automatic daily backups on the free tier (7-day retention). Pro plan has 30-day PITR. There is **no local database** in the v3 stack — the backend's only persistent state is in Supabase, so restoring = choosing a Supabase backup (or re-running `schema.sql` + re-creating your Supabase project).

For extra safety you can export the tables yourself:

```bash
supabase db dump -p <project-ref>     # schema + functions
```

---

## TLS / HTTPS

- **Vercel / Netlify / Cloudflare Pages:** TLS is automatic
- **Fly.io:** TLS is automatic on `*.fly.dev` and custom domains
- **Self-hosted VPS:** use Caddy (easiest) or Traefik or nginx + Let's Encrypt

Caddyfile example (place at `/etc/caddy/Caddyfile`):

```
api.tagzheimer.com {
  reverse_proxy localhost:5000
}

app.tagzheimer.com {
  reverse_proxy localhost:8080
}
```

Caddy auto-provisions Let's Encrypt certs.

---

## Security checklist (production)

- [ ] `JWT_SECRET` is set to a random 32-byte hex string (not the dev fallback)
- [ ] `DEMO_MODE` is `false` (or unset)
- [ ] Supabase service_role key is NEVER exposed in the frontend (only anon key)
- [ ] Supabase RLS policies are enabled (run schema.sql)
- [ ] Supabase DB password is strong and stored safely
- [ ] `CLIENT_URL` matches your frontend URL exactly (CORS)
- [ ] Backend is behind HTTPS (no plain HTTP in production)
- [ ] Rate limits are sensible (default: 200 req / 15 min / IP for general, 100 for /update and /batch)
- [ ] Docker `HEALTHCHECK` works (verify `docker ps` shows "healthy")
- [ ] `secrets.h` is git-ignored (firmware) and not committed
- [ ] Supabase email confirmation is ON for real deployments (confirm email in Authentication → Providers → Email)
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set at frontend build time

---

## Troubleshooting deployments

| Symptom | Fix |
|---------|-----|
| Frontend shows `BACKEND UNREACHABLE` | Check `VITE_API_URL` was set at build time, OR override at runtime via Profile → Backend Settings |
| Mobile app can't pair | Phone and backend must be on the same network, or backend must have public HTTPS URL |
| Firmware `Pairing failed (code=-1)` | Backend URL not reachable from the WiFi network; check `BACKEND_URL` in `config.h` |
| 401 on location updates | Token expired/revoked — firmware will auto re-pair on 401, mobile app you may need to re-pair via Settings |
| Backend can't reach Supabase | Verify `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and that your Supabase project isn't paused (free tier pauses after 7 days inactive) |
| CORS errors in browser console | `CLIENT_URL` on backend doesn't match the frontend's URL exactly (including protocol + port) |
| `docker compose up` fails on build | Make sure subprojects have their `package-lock.json` committed (npm ci fails otherwise) |
| EAS build fails | Check `eas.json` is correct; try `eas build --profile preview --clear-cache` |

---

## Update / rollback

### Backend (Docker)

```bash
docker compose pull
docker compose up -d
```

To roll back: pin the image tag in `docker-compose.yml` to a previous version.

### Frontend (Vercel)

Vercel keeps every deployment — rollback instantly via the dashboard → Deployments → Promote.

### Mobile app

EAS Build also keeps every build. Re-submit a previous build via `eas submit --id=<build-id>`.

### Firmware

Just re-flash the ESP32 from Arduino IDE. No OTA yet.

---

## License

Same as the parent Tagzheimer project.
