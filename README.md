# Tagzheimer — Patient Tracking Platform

Real-time GPS tracking system for Alzheimer's patients. Four components, one monochrome dark-mode aesthetic.

> **Runtime:** Backend + frontend use **Bun** (faster installs, smaller Docker images). Mobile app uses **npm** (Expo has rough edges with Bun). Install Bun: `curl -fsSL https://bun.sh/install | bash`.
>
> **Database + Auth:** Handled by [Supabase](https://supabase.com) — Postgres + Auth + RLS. No MongoDB or Firebase. Free tier covers ~500 MB DB + 50,000 MAU auth. In demo mode (`DEMO_MODE=true`) the backend uses an in-memory store, so you can run the whole stack with zero infrastructure.

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   [ ESP32 + NEO-6M ] ── HTTPS ──► [ Backend ] ◄── HTTPS ── [ Android app ]
│                                        │                    (Expo)
│                                        │
│                                        ▼
│                                [ Supabase ]
│                             (Postgres + Auth)
│                                        │
│                                        ▼
│                                  [ Frontend ]  ◄── Caregiver (browser)
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Components

| Folder | What | Tech | Status |
|--------|------|------|--------|
| `backend/` | REST API | Bun + Express + Supabase JS client (or in-memory demo) | v4.0.0-beta |
| `frontend/` | Caregiver dashboard | Vite + React 19 + Tailwind v4 (monochrome dark) | v4.0.0-beta |
| `mobile/` | Android tracker app | Expo SDK 52 + React Native + TypeScript (monochrome dark) | v4.0.0-beta |
| `firmware/` | ESP32-WROVER + NEO-6M firmware | Arduino IDE + TinyGPSPlus + ArduinoJson | v4.0.0-beta |

## Quick start

### 1. Demo mode (5 minutes, no DB, no Supabase, no hardware)

```bash
# Backend in demo mode (in-memory store, accepts mock-token)
cd backend && bun install && DEMO_MODE=true PORT=5000 bun run server.js

# Frontend (in another terminal)
cd frontend && bun install && bun run dev
# Open http://localhost:5173 — sign in with any email/password

# Mobile app (yet another terminal)
cd mobile && npm install --legacy-peer-deps && npx expo start
# Scan QR with Expo Go on your Android phone
# Pair with a FRESH serial (e.g. "PHONE-001") — TAG-001..TAG-004 are
# already owned by the demo user, re-pairing an owned serial returns 409.
# Then claim it in the dashboard (or via POST /api/devices/:id/claim),
# tap "START TRACKING"
```

You're now running the full stack end-to-end with zero infrastructure. The dashboard shows your phone's GPS location updating in real-time.

### 2. Production via Docker

```bash
cp .env.example .env
# Fill in JWT_SECRET (run `openssl rand -hex 32`) + your Supabase credentials
make docker-up

# Frontend: http://localhost:8080
# Backend:  http://localhost:5000/api/health
# (No MongoDB container — Supabase is the database, hosted)
```

### 3. Cloud deployment

See [`DEPLOY.md`](./DEPLOY.md) for the full deployment guide covering Supabase setup, Fly.io / Railway / Render / Vercel / Netlify / EAS Build / Arduino IDE.

## Make commands

```bash
make              # show all commands
make dev          # start backend + frontend in demo mode
make docker-up    # full stack via docker-compose (backend + frontend)
make test         # run all test suites
make help         # same as above
```

## Key features (v4)

> **Upgrading from v3?** See [`CHANGELOG.md`](./CHANGELOG.md) — claim-gated pairing, per-device rate limits, and strict validation are breaking changes. Run `backend/supabase/audit.sql` before deploying against real data.

- **Supabase backend** — Postgres + Auth + RLS. Caregivers sign up/log in with email + password; all tables are row-level-secured per owner.
- **Claim-gated pairing** — POST `/api/devices/pair` provisions OWNERLESS devices only (serial `A-Za-z0-9-_`, 3–64 chars). Re-pairing an owned serial returns `409`; claim via `POST /api/devices/:id/claim` (rotates the pairing secret, revokes pre-claim tokens, returns a fresh tracker token); lost tokens are re-minted by the owner via `POST /api/devices/:id/token`
- **Ownership-enforced writes** — location writes require ownership (user JWT must own the device; device JWT must match it). Ownerless writes via user JWT are `403 — claim first`. Serial lookups for non-owned devices return `404` (no enumeration oracle)
- **Serial-number-based updates** — firmware + mobile app send `serialNumber` (not Mongo `_id`), backend resolves internally
- **Rich telemetry** — every location fix stores battery %, satellites, hdop, altitude, speed, source (`esp32` | `mobile` | `web`)
- **Offline queue** — firmware (NVS, bounded FIFO evict-oldest, max 10) and mobile app (persisted AsyncStorage FIFO, configurable 25/50/100) queue failed sends; sync via `POST /api/location/batch` on next success
- **Location history** — `GET /api/location/:deviceId/history?limit=N` (`limit` strict integer `1..500` else `400`; future timestamps rejected; oversize bodies `413`). Online status is computed from `lastSeen ≤15min` — a silent tracker reads `offline`, never stuck `online`
- **Fail-visible frontend** — no mock-location masquerade: backend outages render empty + error + retry, never synthetic NYC positions
- **Background mobile tracking** — the Android app runs as a foreground service, survives app kill + device reboot, shows action buttons in the notification tray
- **Custom backend URL** — caregivers can change the backend URL at runtime via Profile → Backend Settings (stored in localStorage)
- **Monochrome dark mode** — pure grayscale palette (no hue anywhere), DejaVu Sans Mono everywhere, sharp 0px corners, corner-bracket frames, telemetry-style tabular numbers
- **Deploy anywhere** — Dockerfile + docker-compose + Vercel/Netlify configs + EAS build profiles included

## Architecture

```
backend/
├── server.js                    Express bootstrap with graceful shutdown
├── routes/
│   ├── auth.js                  POST /verify (Supabase user JWT)
│   ├── devices.js               incl. /pair, /:id/claim, /:id/token, /serial/:serialNumber
│   └── location.js              /update, /batch, /:deviceId, /:deviceId/history
├── controllers/
│   ├── authController.js        profile lookup from Supabase `profiles`
│   ├── deviceController.js      incl. pairDevice, claimDevice, refreshDeviceToken, getDeviceBySerial
│   └── locationController.js    incl. batchUpdate, getLocationHistory (ownership-enforced)
├── middleware/
│   ├── auth.js                  verifies device JWTs + Supabase user JWTs (JWKS/HS256)
│   └── validation.js            all express-validator schemas
├── config/
│   ├── demoMode.js              in-memory store with chainable find/limit
│   └── supabase.js              service-role + anon Supabase clients
├── utils/
│   └── deviceTokens.js          JWT issue/verify for devices (pairing secret signed)
├── supabase/
│   └── schema.sql               tables + RLS + demo seed (run in Supabase)
├── models/                      (compat stub — data layer is Supabase JS client)
└── Dockerfile                   multi-stage build, healthcheck, tini
```

```
frontend/
├── src/
│   ├── App.jsx                  routes: Login, Dashboard, /device/:id, /d/:id (public), Map, Profile
│   ├── pages/                   Login, Dashboard, DeviceDetails, DevicePublic, MapPage, Profile
│   ├── components/              Header, Sidebar, BottomNav, DeviceCard, StatCard, AddDeviceModal,
│   │                            MapView, QRScanner, ErrorBoundary
│   ├── hooks/                   useDevices, useLocation (live backend, fail-visible — no mock fallback)
│   ├── services/
│   │   ├── api.js               axios + all v3 endpoints
│   │   ├── backendConfig.js     runtime URL override (localStorage)
│   │   ├── supabase.js          browser Supabase client (anon key, RLS-protected)
│   │   └── mockData.js          test fixtures only (never rendered as live data)
│   ├── context/AuthContext.jsx  Supabase auth (login/signup/logout, demo fallback)
│   ├── utils/constants.js
│   └── index.css                monochrome dark-mode tokens
├── Dockerfile                   nginx-served SPA
├── netlify.toml
├── vercel.json
├── .env.example
└── vite.config.js               dev proxy + production build
```

```
mobile/
├── app/                         Expo Router file-based routes
│   ├── _layout.tsx             root layout (+ tracking bootstrap on boot)
│   ├── index.tsx               pairing screen
│   ├── paired.tsx              tracker screen (live status feed)
│   └── settings.tsx            settings screen
├── src/
│   ├── components/             BracketCard, StatusPill
│   ├── services/
│   │   ├── api.ts              pair, sendFix, syncBatch, pingBackend
│   │   ├── backgroundTask.ts   expo-task-manager location task + offline queue
│   │   ├── gps.ts              expo-location wrappers
│   │   ├── notifications.ts    alert channels + notifications
│   │   ├── powerManagement.ts  wake lock + battery monitoring
│   │   └── storage.ts          SecureStore + AsyncStorage + tracking state
│   └── styles/theme.ts         monochrome palette
├── assets/                     icon, adaptive-icon, splash, favicon, notification-icon
├── app.json                     Expo config (Android permissions, plugins)
├── eas.json                     EAS build profiles (preview=APK, production=AAB)
└── tsconfig.json
```

```
firmware/
├── src/
│   ├── tagzheimer_firmware.ino main sketch
│   ├── config.h                 edit for your deployment (SERIAL_NUMBER, BACKEND_URL)
│   ├── secrets.example.h       copy to secrets.h (WiFi creds)
│   ├── gps_handler.{h,cpp}     NEO-6M NMEA parsing
│   ├── wifi_manager.{h,cpp}     WiFi connect/disconnect
│   ├── backend_client.{h,cpp}   pair + send with token in NVS, offline queue
│   ├── status_led.{h,cpp}
│   └── power_manager.{h,cpp}    battery + deep sleep
├── docs/wiring.md
└── README.md
```

## Testing

```bash
make test-backend        # backend vitest suite (37 tests, DEMO_MODE=true)
make test-frontend       # vite production build (code-split)
make test-frontend-unit  # frontend vitest suite (26 tests)
make test-mobile         # TypeScript check (tsc --noEmit) + vitest (13 tests)
make test-mobile-bundle  # Expo Android bundle export
```

## Documentation

- [`backend/README.md`](./backend/README.md) — API reference + pairing flow diagram
- [`frontend/README.md`](./frontend/README.md) — pages, components, theming, auth
- [`mobile/README.md`](./mobile/README.md) — Expo Go quickstart + background tracking + APK build steps
- [`firmware/README.md`](./firmware/README.md) — wiring guide + flash instructions
- [`firmware/docs/wiring.md`](./firmware/docs/wiring.md) — pin map + ASCII schematic
- [`ANDROID_BUILD.md`](./ANDROID_BUILD.md) — building the APK/AAB (Expo Go / EAS / local)
- [`DEPLOY.md`](./DEPLOY.md) — full deployment guide (Supabase, Docker, Fly.io, Railway, Render, Vercel, Netlify, EAS, Arduino)

## License

MIT (or per the LICENSE file in the root).