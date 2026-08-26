# Tagzheimer Tracker — Android Mobile App

A React Native + Expo app that turns an Android phone into a Tagzheimer tracker. Behaves like the ESP32 firmware — runs as a background service, persists across app kills, survives device reboots, shows a foreground notification with action buttons.

Built with the same monochrome dark-mode aesthetic as the web frontend.

## What's new in v2.1

The app is now a **real Android tracker**, not just a foreground testing tool:

- ✅ **Foreground service** — runs continuously in the background (required for Android background location)
- ✅ **Persistent notification** — stays in the notification tray with PAUSE / RESUME / STOP action buttons
- ✅ **Survives app kill** — swipe-away the app, tracking continues
- ✅ **Survives device reboot** — on app launch, re-registers the location task if it was running before
- ✅ **Wake lock during send** — keeps CPU awake during in-flight GPS fix + HTTP request
- ✅ **Offline queue** — fixes that fail to send are queued and synced via batch endpoint on next success
- ✅ **Status alerts** — separate notifications for "tracking started", "backend unreachable" (3 consecutive failures), "pairing success", "battery low"
- ✅ **Battery monitoring** — phone's battery % sent with every fix, separate channel for low-battery alerts
- ✅ **Action buttons** — control tracking from the notification without opening the app
- ✅ **Power management UI** — guides the user to disable battery optimization for the app

## How it works (architecture)

```
┌──────────────────────────────────────────────────────────────┐
│  Paired screen (UI)                                          │
│   └ shows live status from backgroundTask via pub/sub        │
│   └ sends user actions (start/pause/stop) to backgroundTask  │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ subscribeToStatus()
                              │
┌──────────────────────────────────────────────────────────────┐
│  backgroundTask.ts                                           │
│   ├ defines LOCATION_TASK (expo-task-manager)                │
│   ├ defines SYNC_TASK (expo-background-fetch, fallback)      │
│   ├ performTrackingCycle():                                  │
│   │   1. Location.getCurrentPositionAsync                    │
│   │   2. sendFix() → POST /api/location/update               │
│   │   3. on failure: queue in memory, retry on next cycle    │
│   │   4. updateForegroundNotification() (in place)           │
│   ├ startTracking() — registers task + shows notification     │
│   ├ pauseTracking() / resumeTracking() — toggle state        │
│   ├ stopTracking() — unregisters task + dismisses notif       │
│   └ bootstrapTracking() — on app start, re-registers if was  │
│                           running before reboot              │
└──────────────────────────────────────────────────────────────┘
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ notifications│           │ power mgmt   │           │  storage     │
│   service    │           │   service    │           │  (NVS)       │
│              │           │              │           │              │
│ • 2 channels │           │ • withWakeLk │           │ trackingState│
│   - tracking│           │   (partial   │           │  (state +   │
│     (low)    │           │    wake lock)│           │   counters) │
│   - alerts   │           │ • battery % │           │ deviceId +  │
│     (high)   │           │ • low alert  │           │ accessToken │
└──────────────┘           └──────────────┘           └──────────────┘
```

## Quick start

Same as before — see the "Quick start" section below. The new background features activate when you tap **START TRACKING** on the paired screen.

---

## Quick start (5 minutes)

### Option A — Expo Go (fastest, no build step)

1. **Start your Tagzheimer backend in demo mode** (on your dev machine):
   ```bash
   cd backend
   DEMO_MODE=true PORT=5000 npm start
   ```

2. **Install Expo CLI globally** (or use `npx`):
   ```bash
   npm install -g expo-cli
   ```

3. **Install app dependencies**:
   ```bash
   cd mobile
   npm install
   ```

4. **Start the Expo dev server**:
   ```bash
   npx expo start
   ```

5. **Install Expo Go on your Android phone** (Play Store, free).

6. **Scan the QR code** with your phone's camera — Expo Go will load the app.

7. **Pair**:
   - Backend URL: `http://<your-dev-machine-LAN-IP>:5000` (e.g. `http://192.168.1.50:5000`)
     - For Android emulator → use `http://10.0.2.2:5000`
   - Serial: `TAG-001` (existing demo device) or anything you want to auto-provision (e.g. `PHONE-001`)

8. **Tap START TRACKING** — Android will request location permissions. Allow them, including "Allow all the time" for background location.

9. The persistent notification appears in the tray. You can swipe the app away — tracking continues. Open the dashboard and watch the device update.

### Option B — Pre-built APK (install permanently)

See the **Deploying to production** section below.

For a fully local build (no EAS account):

```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

> Local builds require Android Studio + JDK 17.

---

## What it does

The app behaves exactly like the ESP32 firmware:

1. **Pair** — enter a serial number, the backend returns a `deviceId` + `accessToken` (signed JWT). Stored in `SecureStore` (encrypted on-device).
2. **Acquire GPS** — uses `expo-location` with `BestForNavigation` accuracy, requests foreground + background permissions.
3. **Send** — `POST /api/location/update` with `{ serialNumber, latitude, longitude, meta: { battery, source: 'mobile', altitude, speed } }` every N seconds (configurable).
4. **Offline queue** — if the send fails, the fix is queued in memory. On the next successful send, queued fixes are synced via `POST /api/location/batch`.
5. **Auto / Manual mode** — toggle between "send every N seconds" and "send on demand".
6. **Battery reading** — included in every `meta.battery` payload, mirrored to `Device.battery` on the backend.

---

## Screens

### `/` — Pairing screen (entry)
- Backend URL field (with live health-check dot)
- Serial number field
- "PAIR DEVICE" button
- "Demo mode" helper card with the exact bash command to start the backend

### `/paired` — Tracker screen (main)
- Live coordinates card (lat/lon/accuracy/altitude) with "FIXED" / "SEARCHING" pill
- Last transmission card with timestamp + error message
- Battery + next-send countdown tiles
- "SEND NOW" manual button
- Auto/manual toggle
- Transmission log (last 20 entries)

### `/settings` — Settings screen
- Edit backend URL (with health check)
- Pick update interval (10s / 30s / 1m / 5m / 15m)
- View device info (serial, deviceId, truncated token)
- Unpair button (clears SecureStore, returns to pairing)

---

## Architecture

```
mobile/
├── app/                         ← Expo Router file-based routes
│   ├── _layout.tsx              ← root layout (Stack, dark status bar)
│   ├── index.tsx                ← pairing screen
│   ├── paired.tsx               ← tracker screen
│   └── settings.tsx             ← settings screen
├── src/
│   ├── components/
│   │   ├── BracketCard.tsx      ← card with corner brackets (viewfinder aesthetic)
│   │   └── StatusPill.tsx       ← ONLINE / OFFLINE chip
│   ├── services/
│   │   ├── api.ts               ← pair(), sendFix(), syncBatch(), pingBackend()
│   │   ├── gps.ts               ← expo-location wrappers
│   │   └── storage.ts           ← SecureStore + AsyncStorage for config
│   └── styles/
│       └── theme.ts             ← monochrome dark palette + shared styles
├── assets/                      ← icons + splash (PNG)
├── app.json                     ← Expo config (Android permissions, plugins)
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md                    ← this file
```

---

## Backend URL — getting it right

This is the #1 thing people get stuck on. The phone needs to reach your dev machine's backend over the LAN:

| Where your backend runs | What to enter in the app |
|--------------------------|--------------------------|
| On your dev laptop, same WiFi as your phone | `http://<laptop-LAN-IP>:5000` (e.g. `http://192.168.1.50:5000`) |
| On your dev laptop, testing in Android emulator | `http://10.0.2.2:5000` (emulator aliases host loopback as 10.0.2.2) |
| On a deployed server | `https://api.tagzheimer.com` |
| Backend not running | App shows `BACKEND UNREACHABLE` — fix this before pairing |

To find your laptop's LAN IP:
- **macOS**: `ipconfig getifaddr en0`
- **Linux**: `ip addr show wlan0 | grep inet`
- **Windows**: `ipconfig` → look for "IPv4 Address" under your WiFi adapter

---

## Background location (for production)

This app sends fixes **only while it's in the foreground** by default. For real-world tracking, you'd want background updates too — that's a separate permission on Android and requires:

1. Adding `expo-task-manager` and `expo-background-fetch` (already in `package.json`)
2. Defining a background task that calls `sendFix` on an interval
3. Requesting `ACCESS_BACKGROUND_LOCATION` permission (already declared in `app.json`)

The current implementation skips this to keep the demo simple — you'd want a real background task for a deployed patient tracker. PRs welcome.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `BACKEND UNREACHABLE` | Backend isn't running, or wrong URL — see "Backend URL" above |
| `Pairing failed (401)` | Token mismatch — in demo mode the backend should accept `Bearer mock-token`. Verify `DEMO_MODE=true` is set. |
| `No GPS fix` | Go outside, or wait up to 30s for cold-start. Check that location is enabled in Android settings. |
| `PERMISSION REQUIRED` screen | Tap "GRANT PERMISSION" — Android should pop the location permission dialog. |
| App closes when you switch away | Background updates aren't implemented in this demo — keep the app in foreground while testing |
| `Metro bundler crashed` | Run `npx expo start --clear` to wipe the cache |
| Phone won't scan Expo QR code | Use the camera app, or type the URL into Expo Go manually |

---

## License

Same as the parent Tagzheimer project.

---

## Deploying to production

### Option A — EAS Build (recommended, no Android Studio needed)

1. Install the EAS CLI and log in:
   ```bash
   npm install -g eas-cli
   eas login   # create an expo.dev account if you don't have one
   ```

2. Configure the project (one-time):
   ```bash
   cd mobile
   eas build:configure
   ```

3. Build an APK for sideloading:
   ```bash
   eas build --platform android --profile preview
   ```
   EAS gives you a download URL once it finishes (~10 min).

4. Or build an AAB for the Play Store:
   ```bash
   eas build --platform android --profile production
   ```

5. Submit to the Play Store (one-time setup of a Google service account):
   ```bash
   eas submit --platform android --profile production
   ```
   The first time you'll need a `google-service-account.json` (see EAS docs).

### Option B — Local build (no EAS account)

Requires Android Studio + JDK 17:

```bash
cd mobile
npx expo prebuild --platform android    # generates android/ folder
cd android
./gradlew assembleRelease                # build APK
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Signing for Play Store

You'll need to upload a signing key (or let EAS manage it for you with
`eas credentials`). EAS-managed keys are easier — let it handle.

```
# In eas.json (already configured):
#   production → app-bundle (Play Store format)
#   preview    → apk          (sideloading format)
```

### Play Store listing

Title:        `Tagzheimer Tracker`
Short desc:   `Turn your Android phone into a Tagzheimer GPS tracker.`
Full desc:    `Pair this app with your Tagzheimer backend to send GPS
fixes every N seconds. Designed for testing the Tagzheimer patient
tracking platform without flashing the ESP32 firmware. Use serial
TAG-001 in demo mode, or pair with any serial in production.`
Category:     `Tools`
Content:      `Everyone`
Privacy:      This app collects location data to upload to your
self-hosted Tagzheimer backend. It does not send data to any third
party.
