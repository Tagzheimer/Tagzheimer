# Tagzheimer Firmware — ESP32-WROVER + NEO-6M GPS Tracker

Arduino IDE firmware that reads GPS coordinates from a NEO-6M module and POSTs them to the Tagzheimer backend on a configurable interval (default: every 5 minutes). Designed for battery-powered operation with deep sleep between fixes.

> **Status:** v2.0 — easy pairing by serial number against the v3 backend (demo mode + production). Tested logic; you still need to flash to actual hardware for the final integration test.

---

## Hardware Bill of Materials

| Part | Model | Notes |
|------|-------|-------|
| MCU | **ESP32-WROVER** | DevKit with PSRAM (e.g. TTGO, LilyGO, generic WROVER-B) |
| GPS | **u-blox NEO-6M** | with ceramic patch antenna, 9600 baud default |
| LED | any 3 mm or 5 mm LED + 330 Ω resistor | or use the onboard LED on GPIO 2 |
| Button | momentary push button | for SOS (optional, uses BOOT button by default) |
| Battery | 3.7 V LiPo 1000–2000 mAh | with TP4056 charge controller or DevKit with built-in charger |
| Voltage divider | 2 × 100 kΩ resistor | for battery voltage monitoring (optional) |

> ESP32-WROVER vs WROOM: WROVER has PSRAM (4–8 MB) which you don't strictly need for this firmware, but it gives headroom for future features (OTA, on-device ML, etc.). The firmware also runs unchanged on WROOM boards.

---

## Quick Start

### 1. Install libraries

In Arduino IDE: **Sketch → Include Library → Manage Libraries…**

- **TinyGPSPlus** by Mikal Hart
- **ArduinoJson** by Benoit Blanchon (v7 or later)

### 2. Install the ESP32 board package

- **File → Preferences → Additional Board URLs** → add:
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- **Tools → Board → ESP32 Arduino → ESP32 Wrover Kit** (or your specific WROVER board)
- **Tools → Port** → select the COM/tty port

### 3. Configure secrets

```bash
cd firmware/src
cp secrets.example.h secrets.h
# Edit secrets.h with your WiFi SSID and password
```

### 4. Configure the device

Edit `config.h`:

| Setting | What it does |
|---------|--------------|
| `SERIAL_NUMBER` | The serial printed on the device, e.g. `TAG-001`. The backend auto-provisions the device on first pair if it doesn't exist. |
| `BACKEND_URL` | Where your backend is reachable, e.g. `http://192.168.1.50:5000` (dev) or `https://api.tagzheimer.com` (prod). |
| `BACKEND_ACCESS_TOKEN` | Leave **empty** — firmware pairs automatically on first boot and stores the token in NVS. Set to `mock-token` (demo) or a hand-issued token only to skip pairing. |
| `UPDATE_INTERVAL_SECONDS` | How often to wake up and report. Default 300 (5 min). |
| `ENABLE_DEEP_SLEEP` | `1` for battery operation (recommended), `0` while debugging. |

### 5. Wire up the hardware

See [docs/wiring.md](docs/wiring.md) for the pin map and a Fritzing-style ASCII schematic.

### 6. Flash

- Open `tagzheimer_firmware.ino` in Arduino IDE
- Click **Upload**
- Open **Serial Monitor** at **115200 baud** to watch the boot logs

### 7. Register the device in your backend

No manual registration required — the firmware calls `POST /api/devices/pair` with its `SERIAL_NUMBER` on first boot and the backend auto-provisions the device:

- Start the backend in demo mode: `cd backend && DEMO_MODE=true PORT=5000 bun run server.js`
- (Demo mode auto-seeds 4 devices `TAG-001`–`TAG-004`; use one of those serials or anything else you like — pair will create it.)
- The returned `deviceId` + `accessToken` are stored in NVS (`Preferences`) and reused on every boot.

In production, devices auto-provision the same way. You can rename them / assign a patient in the dashboard afterwards.

---

## How It Works

### Lifecycle (one cycle)

```
┌─────────────────┐
│  Deep sleep     │ ◄──────┐
│  (5 min timer)  │        │
└────────┬────────┘        │
         │ wake (reset)    │
         ▼                 │
┌─────────────────┐        │
│ 0. ensurePaired │        │
│   (NVS token   │        │
│    or POST /pair)        │
└────────┬────────┘        │
         │                 │
         ▼                 │
┌─────────────────┐        │
│ 1. WiFi connect │        │
└────────┬────────┘        │
         │                 │
         ▼                 │
┌─────────────────┐        │
│ 2. GPS fix      │        │
│   (≤ 90 s)      │        │
└────────┬────────┘        │
         │                 │
         ▼                 │
┌─────────────────┐        │
│ 3. POST to      │        │
│    /api/        │        │
│    location/    │        │
│    update       │        │
└────────┬────────┘        │
         │                 │
         ▼                 │
┌─────────────────┐        │
│ 4. Disconnect   │        │
│    WiFi         │        │
└────────┬────────┘        │
         │                 │
         ▼                 │
┌─────────────────┐        │
│ 5. Deep sleep   │ ───────┘
└─────────────────┘
```

### Pairing & token refresh

1. First boot: `BACKEND_ACCESS_TOKEN` is empty → firmware calls `POST /api/devices/pair` with `SERIAL_NUMBER`.
2. Backend returns `{ deviceId, accessToken }`; both are stored in NVS.
3. Every send uses `Authorization: Bearer <accessToken>`.
4. On a `401` (expired/revoked token) the firmware re-pairs automatically and retries.

### Offline queue

If WiFi is down or the backend is unreachable, the firmware persists the fix to NVS (non-volatile storage) and retries on the next successful cycle. The queue holds up to 10 entries — at the default 5-minute interval that's 50 minutes of tolerance.

### Battery monitoring

Optional: a 2:1 voltage divider (2 × 100 kΩ) feeds battery voltage into GPIO 35 (ADC1_CH7). The reading is sent in the `meta.battery` field of the JSON body and stored by the backend (validated 0–100).

### LED status patterns

| State | Pattern |
|-------|---------|
| Booting | rapid blinks |
| Connecting WiFi | medium blink (250 ms on / 250 ms off) |
| Searching GPS | slow blink (500 ms on / 500 ms off) |
| Sending | rapid blinks |
| Online (success) | short heartbeat (50 ms on / 1950 ms off) |
| Error | very slow blink (1 s on / 1 s off) |
| SOS | solid fast |

---

## Backend Integration

The firmware calls exactly two endpoints (via `backend_client.{h,cpp}`):

**1. Pair (first boot only):**

```http
POST /api/devices/pair
Content-Type: application/json

{
  "serialNumber": "TAG-001"
}
```

Response → `{ deviceId, accessToken, ... }` stored in NVS.

**2. Send fix:**

```http
POST /api/location/update
Content-Type: application/json
Authorization: Bearer <accessToken>

{
  "serialNumber": "TAG-001",
  "latitude": 40.712800,
  "longitude": -74.006000,
  "meta": {
    "sats": 7,
    "hdop": 1.2,
    "battery": 87,
    "device": "Tagzheimer-001"
  }
}
```

This matches `validateUpdateLocation` in `backend/middleware/validation.js`:

```js
body('deviceId').optional().matches(MongoOrUuid)
body('serialNumber').optional().isString().isLength({ min: 3, max: 64 })
body('latitude').isFloat({ min: -90, max: 90 })
body('longitude').isFloat({ min: -180, max: 180 })
body('meta.battery').optional().isInt({ min: 0, max: 100 })
body('meta.hdop').optional().isFloat({ min: 0, max: 99 })
body('meta.satellites').optional().isInt({ min: 0, max: 50 })
```

The firmware's `meta` block is validated and **stored** on each location row (battery, hdop, satellites, altitude, speed, source). Backend returns:

- `201 Created` → `{ success: true, location: {...} }` — firmware marks the cycle successful
- `200` → pair success
- `404` → device not found
- `401` → bad/expired token — firmware re-pairs automatically
- `400` → validation failure
- `5xx` → backend error, firmware will retry then queue offline

### Running the backend in demo mode

Easiest way to test end-to-end without Supabase:

```bash
cd backend
bun install
echo "DEMO_MODE=true" >> .env   # or set in your shell
echo "PORT=5000" >> .env
bun run server.js               # or: npm start
```

In demo mode the backend accepts `Authorization: Bearer mock-token` and seeds 4 devices with serials `TAG-001` through `TAG-004`. The default `SERIAL_NUMBER` in `config.h` matches device #1.

### Local network gotcha

The ESP32 needs to reach your backend. If your backend runs on your laptop at `http://192.168.1.50:5000`, make sure:

1. The ESP32 and the laptop are on the **same WiFi network**
2. The laptop firewall allows inbound on port 5000
3. `BACKEND_URL` in `config.h` is the laptop's LAN IP, not `localhost`

---

## Extending the Backend (optional)

The v3 backend already stores `meta.battery`, `meta.satellites`, `meta.hdop`, `meta.altitude`, `meta.speed`, and `meta.source`. If you want to add a new telemetry field (e.g. an SOS flag), edit the schema:

1. `backend/supabase/schema.sql` — add a column to `public.locations`, e.g.:
   ```sql
   alter table public.locations add column if not exists sos boolean not null default false;
   ```
2. `backend/middleware/validation.js` — add a rule, e.g.:
   ```js
   body('meta.sos').optional().isBoolean(),
   ```
3. `backend/controllers/locationController.js` — copy it into the insert, e.g.:
   ```js
   sos: meta.sos ?? null,
   ```
4. Re-run `schema.sql` in the Supabase SQL editor and surface the field on the dashboard.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[WIFI] connect timeout` | Wrong SSID/password, or 5 GHz only network | Use 2.4 GHz; verify `secrets.h` |
| `[GPS] FIX timeout` | Indoor use, bad antenna, cold start | Take it outside; wait 30 s for warm fix; check wiring |
| `POST failed: code=-1` | Backend unreachable | Check `BACKEND_URL` and that backend is running |
| `POST failed: code=404` | Device not found | Pairing auto-provisions it — unless the serial was invalid at pair time. Check the boot log for the pair attempt. |
| `POST failed: code=401` | Token expired/revoked | Firmware auto re-pairs on 401 — confirm NVS wasn't corrupted |
| GPS shows 0 satellites forever | TX/RX swapped, or wrong baud | Swap `GPS_RX_PIN`/`GPS_TX_PIN`; try 38400 if NEO-M8N |
| ESP32 resets in a loop | Insufficient power | Use a 2 A USB power supply or LiPo with charge controller |
| Deep sleep resets immediately | `ENABLE_DEEP_SLEEP=1` + boot loop | This is normal! Each wake IS a reset — read serial monitor |

---

## File Layout

```
firmware/
├── src/
│   ├── tagzheimer_firmware.ino   ← main sketch (open this in Arduino IDE)
│   ├── config.h                  ← edit this for your deployment (SERIAL_NUMBER, BACKEND_URL)
│   ├── secrets.example.h         ← copy to secrets.h, fill in WiFi creds
│   ├── secrets.h                 ← (you create — git-ignored)
│   ├── gps_handler.{h,cpp}       ← NEO-6M NMEA parsing
│   ├── wifi_manager.{h,cpp}      ← WiFi connect/disconnect
│   ├── backend_client.{h,cpp}    ← pair + send + offline queue + token in NVS
│   ├── status_led.{h,cpp}        ← LED blink patterns
│   └── power_manager.{h,cpp}     ← battery ADC + deep sleep
├── docs/
│   └── wiring.md                 ← pin map + ASCII schematic
├── .gitignore
└── README.md                     ← this file
```

---

## Roadmap / Next Steps

- [ ] WiFi captive portal for first-boot configuration (no hardcoded SSID)
- [ ] OTA firmware updates
- [ ] Motion-aware update rate (MPU6050 → 1 Hz when moving, 5 min when idle)
- [ ] OLED display support (SSD1306 over I2C)
- [ ] LoRa fallback for areas without WiFi

---

## License

Same as the parent Tagzheimer project.