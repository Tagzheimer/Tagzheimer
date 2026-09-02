# Tagzheimer Backend — v3

Bun + Express + Supabase (Postgres + Auth + RLS) backend for the Tagzheimer patient-tracking platform. In demo mode it runs entirely from an in-memory store — no database, no auth service needed.

## Runtime

- **Bun** — `start`/`dev` scripts run `bun run server.js`. Install Bun: `curl -fsSL https://bun.sh/install | bash`.
- **Node via npm also works** — `npm start` is aliased to the same Bun command.

## What's new in v3

- **Supabase replaces MongoDB + Firebase** — Postgres tables (`profiles`, `devices`, `locations`) with RLS policies in `supabase/schema.sql`. Device JWTs are still signed locally with `JWT_SECRET` (+ per-device pairing secret).
- **Supabase user auth** — caregivers sign in via the frontend (Supabase Auth, email + password). The backend verifies their JWTs, supporting both legacy HS256 projects and new ES256 projects via the project's JWKS endpoint.
- **Easy device pairing** — `POST /api/devices/pair` with just a `serialNumber`. Auto-provisions a new device if one doesn't exist. Returns `deviceId` + `accessToken` for subsequent updates.
- **Serial-number-based updates** — `POST /api/location/update` accepts `deviceId` (legacy) or `serialNumber`; if the caller is a device JWT holder the body doesn't need either.
- **Rich telemetry** — `meta.battery`, `meta.satellites`, `meta.hdop`, `meta.altitude`, `meta.speed`, `meta.source` are stored on each `locations` row.
- **Batch sync** — `POST /api/location/batch` pushes an offline queue (up to 100 fixes per call).
- **History endpoint** — `GET /api/location/:deviceId/history?limit=N` returns up to N fixes (max 500), newest first.

## Quick start (demo mode)

```bash
cd backend
bun install
echo "DEMO_MODE=true" >> .env   # or set in your shell
echo "PORT=5000" >> .env
bun run server.js               # or: npm start
# curl http://localhost:5000/api/health
```

In demo mode the backend uses an in-memory store seeded with 4 devices (`TAG-001` through `TAG-004`) and accepts `Bearer mock-token` as auth for everything.

For production, set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` and a strong `JWT_SECRET` (see `supabase/schema.sql` + `.env.example`).

## Supabase setup (production)

1. Create a project at https://supabase.com.
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**. This creates `profiles`, `devices`, `locations`, the RLS policies, and the trigger that auto-creates a profile row on user signup.
3. Copy credentials to your `.env`:

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → service_role (backend only) |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Settings → JWT Secret |

## API reference

### Auth

All endpoints require `Authorization: Bearer <token>`. The middleware (`middleware/auth.js`) accepts three token types:

1. `mock-token` (demo/development mode only) — bypasses all checks.
2. **Device JWT** — issued by `POST /api/devices/pair`, signed with `JWT_SECRET` (plus the device's pairing secret when set). Decoded as `{ kind: 'device', deviceId, serialNumber }`. Sets `req.user.isDevice = true`.
3. **Supabase user JWT** — issued by Supabase Auth on sign in. Verified via JWKS (ES256/RS256) or HS256 with `SUPABASE_JWT_SECRET`. Sets `req.user.uid` from the `sub` claim.

### Auth endpoints

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/auth/verify` | — | `{ success, user: { id, name, email, phone } }` |

### Devices

| Method | Path | Body / Params | Returns |
|--------|------|----------------|---------|
| `POST` | `/api/devices/pair` | `{ serialNumber, name?, patientName?, notes? }` | `{ success, created, deviceId, serialNumber, deviceName, patientName, accessToken }` |
| `GET` | `/api/devices/serial/:serialNumber` | — | `{ success, device: { id, deviceId, serialNumber, name, status, lastSeen, battery } }` |
| `GET` | `/api/devices` | — | `[Device]` (owner-scoped) |
| `POST` | `/api/devices` | `{ name, serialNumber, patientName, notes? }` | `Device` (owner-scoped insert) |
| `GET` | `/api/devices/:id` | — | `Device` |
| `DELETE` | `/api/devices/:id` | — | `{ success, message }` |

### Location

| Method | Path | Body / Params | Returns |
|--------|------|----------------|---------|
| `POST` | `/api/location/update` | `{ deviceId?, serialNumber?, latitude, longitude, meta? }` | `201 { success, location }` |
| `POST` | `/api/location/batch` | `{ deviceId?, serialNumber?, fixes: [{ latitude, longitude, timestamp?, meta? }] }` | `201 { success, inserted }` |
| `GET` | `/api/location/:deviceId` | — | `{ latitude, longitude, timestamp }` (latest) |
| `GET` | `/api/location/:deviceId/history?limit=50` | — | `{ success, count, locations: [...] }` (max limit 500) |

#### `meta` block (optional, on `/update` and `/batch`)

```json
{
  "meta": {
    "battery": 87,           // 0-100
    "satellites": 7,          // 0-50
    "hdop": 1.2,              // float, lower = better
    "altitude": 120.5,        // meters
    "speed": 0.0,             // km/h
    "source": "esp32",        // 'esp32' | 'mobile' | 'web' | 'unknown'
    "device": "Tagzheimer-001" // free-form label
  }
}
```

A top-level `battery` and `source` (outside `meta`) are also accepted.

#### Validation

- `deviceId` accepts either a 24-char Mongo-style hex ID or a UUID (Supabase). `serialNumber` must be 3–64 chars.
- Either `deviceId`, `serialNumber`, or a device-JWT caller is required.
- `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180]; all `meta` fields are optional and range-checked.

## Pairing flow

```
┌──────────────┐                                  ┌──────────────┐
│  Tracker     │                                  │   Backend    │
│ (firmware /  │                                  │              │
│ mobile app)  │                                  │              │
└──────┬───────┘                                  └──────┬───────┘
       │                                                  │
       │  POST /api/devices/pair  { serialNumber }        │
       │ ─────────────────────────────────────────────────>│
       │                                                  │
       │           200 { deviceId, accessToken }          │
       │ <─────────────────────────────────────────────────│
       │                                                  │
       │  store (deviceId, accessToken) locally           │
       │                                                  │
       │  POST /api/location/update                      │
       │  Authorization: Bearer <accessToken>           │
       │  { serialNumber, latitude, longitude, meta }    │
       │ ─────────────────────────────────────────────────>│
       │                                                  │
       │              201 { success, location }           │
       │ <─────────────────────────────────────────────────│
       │                                                  │
       │  ... repeat every N seconds ...                  │
       │                                                  │
```

If the tracker is offline for a while, it queues fixes locally and pushes them all in one call:

```
       │  POST /api/location/batch                        │
       │  Authorization: Bearer <accessToken>             │
       │  { serialNumber, fixes: [{latitude, longitude,  │
       │     timestamp, meta}, ...] }                      │
       │ ─────────────────────────────────────────────────>│
       │                                                  │
       │           201 { success, inserted: N }            │
       │ <─────────────────────────────────────────────────│
```

On `401`, the backend rejects the timestamp — devices (firmware/mobile) detect this and re-pair automatically.

## Health check

```
GET /api/health
{
  "success": true,
  "message": "Tagzheimer API is running",
  "version": "3.0.0",
  "mode": "demo",              // "demo" | "production"
  "database": "in-memory",     // "in-memory" | "supabase" | "unconfigured"
  "timestamp": "2026-08-20T..."
}
```

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | no | `5000` | HTTP port |
| `NODE_ENV` | no | — | `development` enables the `mock-token` shortcut |
| `DEMO_MODE` | no | `false` | `true` uses the in-memory store, skips Supabase entirely |
| `JWT_SECRET` | yes (prod) | dev fallback | Signs device JWTs — set a strong random string (`openssl rand -hex 32`) |
| `SUPABASE_URL` | yes (prod) | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes (prod) | — | anon public key (used by the pairing endpoint) |
| `SUPABASE_SERVICE_KEY` | yes (prod) | — | service_role key (backend only, bypasses RLS) |
| `SUPABASE_JWT_SECRET` | yes (prod) | — | verifies legacy HS256 user JWTs |
| `CLIENT_URL` | no | `http://localhost:5173` | CORS origin for the frontend |

## File layout

```
backend/
├── server.js                    Express bootstrap + rate limits + graceful shutdown
├── routes/
│   ├── auth.js                  POST /verify
│   ├── devices.js               incl. /pair and /serial/:serialNumber
│   └── location.js              /update, /batch, /:deviceId, /:deviceId/history
├── controllers/
│   ├── authController.js        profile lookup from `profiles` table
│   ├── deviceController.js      incl. pairDevice, getDeviceBySerial
│   └── locationController.js    incl. batchUpdate, getLocationHistory
├── middleware/
│   ├── auth.js                  device JWT + Supabase user JWT verification
│   └── validation.js            all express-validator schemas
├── config/
│   ├── demoMode.js              in-memory store seeded with TAG-001..TAG-004
│   └── supabase.js              service-role + anon clients, JWT secret accessor
├── utils/
│   ├── helpers.js               distance / timestamp helpers
│   └── deviceTokens.js          JWT issue/verify for devices
├── supabase/
│   └── schema.sql               profiles/devices/locations + RLS + demo seed
├── models/index.js              compat stub (demo store in demo mode)
├── .env.example
├── package.json                 (Bun: `bun run server.js`)
└── Dockerfile                   multi-stage build, healthcheck, tini, non-root user
```

## License

Same as the parent Tagzheimer project.