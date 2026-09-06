# Tagzheimer Frontend — Caregiver Dashboard

Vite + React 19 + Tailwind v4 single-page app for caregivers. Monochrome dark-mode, telemetry-style aesthetic. Handles Supabase auth, the device dashboard, the live map, device details, and a public per-device page.

## Runtime

- **Bun** — `bun install && bun run dev`. Install Bun: `curl -fsSL https://bun.sh/install | bash`.
- **npm works too** — the scripts are plain `vite dev` / `vite build`.

## Quick start (demo mode)

```bash
cd frontend
bun install
bun run dev
# Open http://localhost:5173 — sign in with any email/password
```

With no `VITE_SUPABASE_URL` set, the app runs in demo mode: login accepts anything, uses `mock-token` for API calls, and stores the session in localStorage.

Point the backend at the API via one of:
1. **Vite dev proxy** (default) — `/api` → `http://localhost:5000` (`VITE_DEV_BACKEND` to override).
2. **Build-time env** — `VITE_API_URL` baked in at build time.
3. **Runtime override** — Settings → Backend (localStorage, highest priority).

## Features

- **Auth** — Supabase email/password sign in + sign up (`@supabase/supabase-js`, anon key, RLS-protected). Auto-restores the session on reload.
- **Dashboard** — device cards (name, patient, battery, status, last seen), stats, add-device modal, QR-code device sharing.
- **Map** — Leaflet map with live trails from `useLocation` (polls `GET /api/location/:id/history`).
- **Device details** — full device info + telemetry + location history.
- **Device public page** — `/d/:id` live lookup (auth-gated `401/403/404` states, no mock data, no fake caregiver contacts).
- **QR scanning** — `@yudiel/react-qr-scanner` to pair/import devices from a printed serial.
- **Settings control center** (`/profile`) — appearance (text size, contrast, motion, focus), map style/zoom/trail/crosshair, units/coords/clock, sort/filter/low-battery threshold, auto-refresh, browser alerts, backend URL + timeout + diagnostics, JSON/CSV export + settings backup. Instant-apply via `services/settings.js` (localStorage, versioned + sanitized).
- **Device alerts** — offline / reconnect / low-battery browser notifications from `DevicesContext` (`services/alerts.js`).
- **Monochrome dark mode** — grayscale tokens in `index.css`, DejaVu Sans Mono, sharp corners, corner-bracket frames, tabular numbers.

## Pages & routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | public (redirects to dashboard when signed in) |
| `/dashboard` | Dashboard | protected |
| `/device/:id` | DeviceDetails | protected |
| `/d/:id` | DevicePublic | public (shareable) |
| `/map` | MapPage | protected (full width) |
| `/profile` | Settings | protected (redirects to `/profile/account`) |
| `/profile/account` | Settings · Account | protected |
| `/profile/appearance` | Settings · Appearance | protected |
| `/profile/map` | Settings · Map & display | protected |
| `/profile/devices` | Settings · Devices | protected |
| `/profile/alerts` | Settings · Notifications | protected |
| `/profile/backend` | Settings · Backend & network | protected |
| `/profile/data` | Settings · Data | protected |
| `/profile/about` | Settings · About (docs, repo, legal) | protected |
| `/terms` | Terms | public |
| `/privacy` | Privacy | public |

Routes are guarded by `ProtectedRoute` / `PublicRoute` in `App.jsx`. A global `ErrorBoundary` wraps the app.

## File layout

```
frontend/
├── index.html
├── vite.config.js               dev proxy (/api → backend) + optional HTTPS + preview proxy
├── Dockerfile                   Bun install + Vite build → nginx SPA (with SPA fallback)
├── netlify.toml                 Netlify build/publish + redirects + security headers
├── vercel.json                  Vercel build config + rewrites + security headers
├── eslint.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx                  router + auth guards + layout
│   ├── index.css                Tailwind v4 + monochrome dark-mode tokens
│   ├── pages/
│   │   ├── Login.jsx            email/password sign in + sign up (demo fallback)
│   │   ├── Dashboard.jsx        device grid + stats + add-device
│   │   ├── DeviceDetails.jsx    single-device view + telemetry
│   │   ├── DevicePublic.jsx     shareable public device page (/d/:id)
│   │   ├── MapPage.jsx          full-width live map
│   │   ├── Profile.jsx          redirect → /profile/account (backwards compat)
│   │   ├── settings/
│   │   │   ├── SettingsLayout.jsx   sidebar shell (rail + chips + identity)
│   │   │   ├── Account/Appearance/MapDisplay/Device/Alert/Backend/Data/AboutSettings.jsx
│   │   │   ├── nav.js               section paths + labels (single source)
│   │   │   └── usePrefs.js          reactive settings snapshot hook
│   │   ├── Terms.jsx / Privacy.jsx  doc-styled legal pages
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx          desktop nav
│   │   ├── BottomNav.jsx        mobile nav
│   │   ├── Footer.jsx           shared footer (docs, repo, legal)
│   │   ├── LegalLayout.jsx      doc-site shell for legal pages
│   │   ├── settings/SettingsControls.jsx  Section/Row/Segmented/Switch/Slider
│   │   ├── DeviceCard.jsx
│   │   ├── StatCard.jsx
│   │   ├── AddDeviceModal.jsx
│   │   ├── MapView.jsx          Leaflet map + trails
│   │   ├── QRScanner.jsx        QR modal (scan a device serial)
│   │   └── ErrorBoundary.jsx
│   ├── hooks/
│   │   ├── useDevices.js        re-export of the DevicesContext hook
│   │   └── useLocation.js       polling location history for a device
│   ├── context/
│   │   ├── AuthContext.jsx      Supabase auth provider + demo fallback
│   │   └── DevicesContext.jsx   shared device fetch + polling + alerts
│   ├── services/
│   │   ├── api.js               axios instance (+ auth interceptor, settings timeout) + endpoint helpers (incl. `mintToken`)
│   │   ├── backendConfig.js     backend URL resolution + health ping
│   │   ├── settings.js          central prefs store (persist, sanitize, import/export, sort/filter)
│   │   ├── alerts.js            browser-notification watcher helpers
│   │   ├── supabase.js          browser Supabase client (anon key)
│   │   └── mockData.js          test fixtures only (never rendered as live data)
│   └── utils/
│       ├── constants.js
│       └── format.js            units/coords/clock/timestamp formatting + CSV export
```

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_URL` | no | empty (uses `/api` proxy in dev) | Backend URL for production builds |
| `VITE_DEV_BACKEND` | no | `http://localhost:5000` | Dev-only backend target for the `/api` proxy |
| `VITE_SUPABASE_URL` | yes (prod) | empty (demo mode) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes (prod) | empty (demo mode) | Supabase anon key (browser-safe) |
| `VITE_APP_NAME` / `VITE_APP_VERSION` | no | Tagzheimer / 3.0.0 | App metadata |

> Leave `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` empty for demo mode (mock-token auth + localStorage session).

## Testing

```bash
bun run build      # production build (also used by `make test-frontend`)
bun run lint       # ESLint
```

## License

Same as the parent Tagzheimer project.