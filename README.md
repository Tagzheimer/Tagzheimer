# Tagzheimer — Patient Tracking Platform

Real-time GPS tracking system for Alzheimer's patients. Four components, one monochrome dark-mode aesthetic.

> **Runtime:** Backend + frontend use **Bun** (faster installs, smaller Docker images). Mobile app uses **npm** (Expo has rough edges with Bun). Install Bun: `curl -fsSL https://bun.sh/install | bash`.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [ ESP32 + NEO-6M ] ── HTTPS ──► [ Backend ] ◄── HTTPS ── [ Android app ]
│                                       │                    (Expo)
│                                       │
│                                       ▼
│                                  [ MongoDB ]
│                                       │
│                                       ▼
│                                  [ Frontend ]  ◄── Caregiver (browser)
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

| Folder | What | Tech | Status |
|--------|------|------|--------|
| `backend/` | REST API | Node.js + Express + MongoDB (or in-memory demo) | v2.0 |
| `frontend/` | Caregiver dashboard | Vite + React 19 + Tailwind v4 (monochrome dark) | v2.0 |
| `mobile/` | Android tracker app | Expo + React Native + TypeScript (monochrome dark) | v2.0 |
| `firmware/` | ESP32-WROVER + NEO-6M firmware | Arduino IDE + TinyGPSPlus + ArduinoJson | v2.0 |

## Quick start

### 1. Demo mode (5 minutes, no DB, no Firebase, no hardware)

```bash
# Backend in demo mode (in-memory store, accepts mock-token)
cd backend && DEMO_MODE=true npm start

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
# Open http://localhost:5173 — sign in with any email/password

# Mobile app (yet another terminal)
cd mobile && npm install --legacy-peer-deps && npx expo start
# Scan QR with Expo Go on your Android phone
# Pair with serial "TAG-001", tap "Send Now"
```

You're now running the full stack end-to-end with zero infrastructure. The dashboard shows your phone's GPS location updating in real-time.

### 2. Production via Docker

```bash
cp .env.example .env
# Set JWT_SECRET in .env (run `openssl rand -hex 32`)
make docker-up

# Frontend: http://localhost:8080
# Backend:  http://localhost:5000/api/health
# MongoDB:  mongodb://localhost:27017
```

### 3. Cloud deployment

See [`DEPLOY.md`](./DEPLOY.md) for the full deployment guide covering Fly.io / Railway / Render / Vercel / Netlify / EAS Build / Arduino IDE.

## Make commands

```bash
make              # show all commands
make dev          # start backend + frontend in demo mode
make docker-up    # full stack via docker-compose
make test         # run all test suites
make help         # same as above
```

## Key features (v2.0)

- **Easy device pairing** — POST `/api/devices/pair` with just a serial number; auto-provisions if device doesn't exist; returns a signed JWT for subsequent updates
- **Serial-number-based updates** — firmware + mobile app send `serialNumber` (not Mongo `_id`), backend resolves internally
- **Rich telemetry** — every location fix stores battery %, satellites, hdop, altitude, speed, source (`esp32` | `mobile` | `web`)
- **Offline queue** — both firmware (NVS) and mobile app (in-memory) queue failed sends; sync via `POST /api/location/batch` on next success
- **Location history** — `GET /api/location/:deviceId/history?limit=N` for trail visualization
- **Custom backend URL** — caregivers can change the backend URL at runtime via Profile → Backend Settings (stored in localStorage)
- **Monochrome dark mode** — pure grayscale palette (no hue anywhere), DejaVu Sans Mono everywhere, sharp 0px corners, corner-bracket frames, telemetry-style tabular numbers
- **Deploy anywhere** — Dockerfile + docker-compose + Vercel/Netlify configs + EAS build profiles included

## Architecture

```
backend/
├── server.js                    Express bootstrap with graceful shutdown
├── routes/
│   ├── auth.js
│   ├── devices.js               incl. /pair and /serial/:serialNumber
│   └── location.js              /update, /batch, /:deviceId, /:deviceId/history
├── controllers/
│   ├── authController.js
│   ├── deviceController.js      incl. pairDevice, getDeviceBySerial
│   └── locationController.js    incl. batchUpdate, getLocationHistory
├── middleware/
│   ├── auth.js                  verifyFirebaseToken (now accepts device JWTs)
│   └── validation.js            all express-validator schemas
├── models/
│   ├── Device.js                added pairingSecret, lastSeen
│   └── Location.js              added satellites, hdop, altitude, speed, battery, source, raw
├── utils/
│   └── deviceTokens.js          JWT issue/verify for devices
├── config/
│   ├── demoMode.js              in-memory store with chainable find/limit
│   ├── db.js
│   └── firebase.js
└── Dockerfile                   multi-stage build, healthcheck, tini
```

```
frontend/
├── src/
│   ├── App.jsx
│   ├── pages/                   Login, Dashboard, MapPage, DeviceDetails, DevicePublic, Profile
│   ├── components/              Header, Sidebar, BottomNav, DeviceCard, StatCard, AddDeviceModal,
│   │                            MapView, QRScanner, ErrorBoundary
│   ├── hooks/                   useDevices, useLocation (uses real backend, falls back to mock)
│   ├── services/
│   │   ├── api.js               axios + all v2 endpoints
│   │   ├── backendConfig.js     runtime URL override
│   │   ├── mockData.js          fallback data
│   │   └── firebase.js
│   ├── context/AuthContext.jsx
│   ├── styles/theme             in index.css
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
│   ├── _layout.tsx             root layout
│   ├── index.tsx               pairing screen
│   ├── paired.tsx              tracker screen
│   └── settings.tsx            settings screen
├── src/
│   ├── components/             BracketCard, StatusPill
│   ├── services/               api.ts, gps.ts, storage.ts
│   └── styles/theme.ts         monochrome palette
├── assets/                     icon, splash, favicon
├── app.json                     Expo config (Android permissions)
├── eas.json                     EAS build profiles (preview=APK, production=AAB)
└── tsconfig.json
```

```
firmware/
├── src/
│   ├── tagzheimer_firmware.ino main sketch
│   ├── config.h                 edit for your deployment
│   ├── secrets.example.h       copy to secrets.h
│   ├── gps_handler.{h,cpp}     NEO-6M NMEA parsing
│   ├── wifi_manager.{h,cpp}     WiFi connect/disconnect
│   ├── backend_client.{h,cpp}   pair + send with token in NVS
│   ├── status_led.{h,cpp}
│   └── power_manager.{h,cpp}    battery + deep sleep
├── docs/wiring.md
└── README.md
```

## Testing

```bash
make test-backend       # 9 positive + 3 negative tests against demo-mode backend
make test-frontend      # vite build, ~150 modules
make test-mobile        # TypeScript check
make test-mobile-bundle # Expo Android bundle
```

All tests must pass before any release.

## Documentation

- [`backend/README.md`](./backend/README.md) — API reference + pairing flow diagram
- [`frontend/README.md`](./frontend/README.md) — component structure + theming
- [`mobile/README.md`](./mobile/README.md) — Expo Go quickstart + APK build steps
- [`firmware/README.md`](./firmware/README.md) — wiring guide + flash instructions
- [`firmware/docs/wiring.md`](./firmware/docs/wiring.md) — pin map + ASCII schematic
- [`DEPLOY.md`](./DEPLOY.md) — full deployment guide (Docker, Fly.io, Railway, Render, Vercel, Netlify, EAS, Arduino)
- [`worklog.md`](./worklog.md) — multi-agent worklog (history of how this was built)

## License

MIT (or per the LICENSE file in the root).
