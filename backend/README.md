# Tagzheimer Backend — v2

Express + MongoDB (or in-memory demo store) backend for the Tagzheimer patient-tracking platform.

## What's new in v2

- **Easy device pairing** — `POST /api/devices/pair` with just a `serialNumber`. Auto-provisions a new device if one doesn't exist. Returns `deviceId` + `accessToken` for subsequent updates.
- **Serial-number based updates** — `POST /api/location/update` accepts either `deviceId` (legacy) or `serialNumber` (new). The mobile app / firmware only need to know the serial number.
- **Device-scoped JWTs** — pairing issues a per-device JWT that's used as `Bearer <accessToken>`. The auth middleware accepts either Firebase user tokens (caregivers) or device JWTs (trackers).
- **Telemetry fields** — `meta.battery`, `meta.satellites`, `meta.hdop`, `meta.altitude`, `meta.speed`, `meta.source` are now stored on each `Location` document (the schema was previously lat/lon only).
- **Batch sync** — `POST /api/location/batch` lets the mobile app push an offline queue when it comes back online (up to 100 fixes per call).
- **History endpoint** — `GET /api/location/:deviceId/history?limit=N` returns up to N fixes, newest first.
- **Serial lookup** — `GET /api/devices/serial/:serialNumber` for trackers to discover `deviceId` from a printed serial.

## Quick start

```bash
cd backend
cp .env.example .env   # if there's one; otherwise just create .env
echo "DEMO_MODE=true" >> .env
echo "PORT=5000" >> .env
echo "JWT_SECRET=any-random-string" >> .env
npm install
npm start
```

In demo mode the backend uses an in-memory store seeded with 4 devices (`TAG-001` through `TAG-004`) and accepts `Bearer mock-token` as auth for everything.

For production, set `MONGO_URI`, Firebase service account vars, and a strong `JWT_SECRET`.

## API reference

### Auth

All endpoints require `Authorization: Bearer <token>`. The middleware accepts three token types:

1. `mock-token` (demo mode only) — bypasses all checks
2. **Device JWT** — issued by `POST /api/devices/pair`. Decoded as `{ kind: 'device', deviceId, serialNumber }`. Sets `req.user.isDevice = true`.
3. **Firebase user ID token** — for caregiver-facing endpoints.

### Devices

| Method | Path | Body / Params | Returns |
|--------|------|----------------|---------|
| `POST` | `/api/devices/pair` | `{ serialNumber, name?, patientName?, notes? }` | `{ success, created, deviceId, serialNumber, deviceName, patientName, accessToken }` |
| `GET` | `/api/devices/serial/:serialNumber` | — | `{ success, device: { id, deviceId, serialNumber, name, status, lastSeen, battery } }` |
| `GET` | `/api/devices` | — | `[Device]` (owner-scoped) |
| `POST` | `/api/devices` | `{ name, serialNumber, patientName, notes? }` | `Device` |
| `GET` | `/api/devices/:id` | — | `Device` |
| `DELETE` | `/api/devices/:id` | — | `{ success, message }` |

### Location

| Method | Path | Body / Params | Returns |
|--------|------|----------------|---------|
| `POST` | `/api/location/update` | `{ deviceId?, serialNumber?, latitude, longitude, meta? }` | `201 { success, location }` |
| `POST` | `/api/location/batch` | `{ deviceId?, serialNumber?, fixes: [{ latitude, longitude, timestamp?, meta? }] }` | `201 { success, inserted }` |
| `GET` | `/api/location/:deviceId` | — | `{ latitude, longitude, timestamp }` (latest) |
| `GET` | `/api/location/:deviceId/history?limit=50` | — | `{ success, count, locations: [...] }` |

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

## Testing

A self-contained test script exercises every new endpoint:

```bash
bash /home/z/my-project/scripts/test_backend.sh
```

It starts the server in demo mode on port 5060, runs 9 positive tests + 3 negative tests, and tears down.

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | no | `5000` | HTTP port |
| `NODE_ENV` | no | — | `development` enables demo-mode mock-token shortcut |
| `DEMO_MODE` | no | — | `true` uses in-memory store, skips Firebase + Mongo |
| `JWT_SECRET` | yes (prod) | `tagzheimer-dev-secret-change-me` | Signs device JWTs — set to a strong random string |
| `MONGO_URI` | yes (prod) | — | MongoDB connection string |
| `FIREBASE_PROJECT_ID` | yes (prod) | — | Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | yes (prod) | — | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | yes (prod) | — | Firebase service account (PEM, with `\n` literals) |
| `CLIENT_URL` | no | `http://localhost:5173` | CORS origin for the frontend |

## File layout

```
backend/
├── server.js                    — Express bootstrap
├── routes/
│   ├── auth.js
│   ├── devices.js               — incl. /pair and /serial/:serialNumber
│   └── location.js              — /update, /batch, /:deviceId, /:deviceId/history
├── controllers/
│   ├── authController.js
│   ├── deviceController.js      — incl. pairDevice, getDeviceBySerial
│   └── locationController.js    — incl. batchUpdate, getLocationHistory
├── middleware/
│   ├── auth.js                  — verifyFirebaseToken (now accepts device JWTs)
│   └── validation.js            — all express-validator schemas
├── models/
│   ├── Device.js                — added pairingSecret, lastSeen
│   └── Location.js              — added satellites, hdop, altitude, speed, battery, source, raw
├── utils/
│   ├── helpers.js
│   └── deviceTokens.js          — NEW: JWT issue/verify for devices
├── config/
│   ├── demoMode.js              — extended to support new flow + chainable find/limit
│   ├── db.js
│   └── firebase.js
└── services/firebaseService.js
```

## License

Same as the parent Tagzheimer project.
