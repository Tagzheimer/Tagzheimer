# Tagzheimer Firmware — ESP32-WROVER + NEO-6M GPS Tracker

Arduino IDE firmware that reads GPS coordinates from a NEO-6M module and POSTs them to the Tagzheimer backend's `/api/location/update` endpoint on a configurable interval (default: every 5 minutes). Designed for battery-powered operation with deep sleep between fixes.

> **Status:** v1.0 — works against the existing Tagzheimer backend (demo mode + production). Tested logic; you still need to flash to actual hardware for the final integration test.

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
| `DEVICE_ID` | MongoDB `_id` of the device document in your backend. Get it from `db.devices.findOne({serialNumber:"TAG-001"})._id` or from the dashboard. Must be a 24-char hex string. |
| `BACKEND_URL` | Where your backend is reachable, e.g. `http://192.168.1.50:5000` (dev) or `https://api.tagzheimer.com` (prod). |
| `AUTH_TOKEN` | `mock-token` in dev/demo mode, or a Firebase ID token in production. |
| `UPDATE_INTERVAL_SECONDS` | How often to wake up and report. Default 300 (5 min). |
| `ENABLE_DEEP_SLEEP` | `1` for battery operation (recommended), `0` while debugging. |

### 5. Wire up the hardware

See [docs/wiring.md](docs/wiring.md) for the pin map and a Fritzing-style ASCII schematic.

### 6. Flash

- Open `tagzheimer_firmware.ino` in Arduino IDE
- Click **Upload**
- Open **Serial Monitor** at **115200 baud** to watch the boot logs

### 7. Register the device in your backend

The backend's `validateUpdateLocation` middleware requires `deviceId` to be a valid Mongo ID pointing to an existing `Device` document. Before the firmware can POST, the device must exist:

- Start the backend in demo mode: `DEMO_MODE=true npm start`
- (Demo mode auto-seeds 4 devices; use `_id` = `000000000000000000000001` which matches `DEVICE_ID` in `config.h` — that's why that's the default.)

In production: create the device via the dashboard (which calls `POST /api/devices`) and copy the returned `_id` into `config.h`.

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

### Offline queue

If WiFi is down or the backend is unreachable, the firmware persists the fix to NVS (non-volatile storage) and retries on the next successful cycle. The queue holds up to 10 entries — at the default 5-minute interval that's 50 minutes of tolerance.

### Battery monitoring

Optional: a 2:1 voltage divider (2 × 100 kΩ) feeds battery voltage into GPIO 35 (ADC1_CH7). The reading is sent in the `meta.battery` field of the JSON body. The current backend ignores this field, but the device model already has a `battery` field (0–100) ready to be wired up — see "Extending the backend" below.

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

The firmware calls exactly one endpoint:

```http
POST /api/location/update
Content-Type: application/json
Authorization: Bearer mock-token

{
  "deviceId": "000000000000000000000001",
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
body('deviceId').isMongoId()
body('latitude').isFloat({ min: -90, max: 90 })
body('longitude').isFloat({ min: -180, max: 180 })
```

The `meta` block is ignored by the current validator (extra fields pass through `express.json()` silently), but it's there for future use. Backend returns:

- `201 Created` → `{ success: true, location: {...} }` — firmware marks the cycle successful
- `404` → device not found (check `DEVICE_ID` in `config.h`)
- `401` → bad token (check `AUTH_TOKEN`)
- `400` → validation failure (usually bad `deviceId` format)
- `5xx` → backend error, firmware will retry then queue offline

### Running the backend in demo mode

Easiest way to test end-to-end without Firebase:

```bash
cd backend
cp .env.example .env   # if there's one; otherwise create .env
echo "DEMO_MODE=true" >> .env
echo "PORT=5000" >> .env
npm install
npm start
```

In demo mode the backend accepts `Authorization: Bearer mock-token` and seeds 4 devices with IDs `000000000000000000000001` through `000000000000000000000004`. The firmware's default `DEVICE_ID` matches device #1.

### Local network gotcha

The ESP32 needs to reach your backend. If your backend runs on your laptop at `http://192.168.1.50:5000`, make sure:

1. The ESP32 and the laptop are on the **same WiFi network**
2. The laptop firewall allows inbound on port 5000
3. `BACKEND_URL` in `config.h` is the laptop's LAN IP, not `localhost`

---

## Extending the Backend (optional)

The firmware already sends `meta.battery`. To store it:

1. `backend/models/Location.js` — add fields:
   ```js
   satellites: Number,
   hdop:       Number,
   battery:    Number,
   ```
2. `backend/middleware/validation.js` — extend `validateUpdateLocation`:
   ```js
   body('meta.sats').optional().isInt({ min: 0, max: 50 }),
   body('meta.battery').optional().isInt({ min: 0, max: 100 }),
   ```
3. `backend/controllers/locationController.js` — read `req.body.meta` and pass to `Location.create`.

Same pattern works for an SOS flag — add `body('meta.sos').optional().isBoolean()` and surface it on the dashboard.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[WIFI] connect timeout` | Wrong SSID/password, or 5 GHz only network | Use 2.4 GHz; verify `secrets.h` |
| `[GPS] FIX timeout` | Indoor use, bad antenna, cold start | Take it outside; wait 30 s for warm fix; check wiring |
| `POST failed: code=-1` | Backend unreachable | Check `BACKEND_URL` and that backend is running |
| `POST failed: code=404` | `DEVICE_ID` not in DB | Register device first; verify the 24-char hex |
| `POST failed: code=401` | Bad token | In demo mode use `mock-token`; in prod, mint a real Firebase token |
| GPS shows 0 satellites forever | TX/RX swapped, or wrong baud | Swap `GPS_RX_PIN`/`GPS_TX_PIN`; try 38400 if NEO-M8N |
| ESP32 resets in a loop | Insufficient power | Use a 2 A USB power supply or LiPo with charge controller |
| Deep sleep resets immediately | `ENABLE_DEEP_SLEEP=1` + boot loop | This is normal! Each wake IS a reset — read serial monitor |

---

## File Layout

```
firmware/
├── src/
│   ├── tagzheimer_firmware.ino   ← main sketch (open this in Arduino IDE)
│   ├── config.h                  ← edit this for your deployment
│   ├── secrets.example.h         ← copy to secrets.h, fill in WiFi creds
│   ├── secrets.h                 ← (you create — git-ignored)
│   ├── gps_handler.{h,cpp}       ← NEO-6M NMEA parsing
│   ├── wifi_manager.{h,cpp}      ← WiFi connect/disconnect
│   ├── backend_client.{h,cpp}    ← HTTP POST + offline queue
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
- [ ] Firebase token refresh via REST API (current: static token)
- [ ] Motion-aware update rate (MPU6050 → 1 Hz when moving, 5 min when idle)
- [ ] OLED display support (SSD1306 over I2C)
- [ ] LoRa fallback for areas without WiFi

---

## License

Same as the parent Tagzheimer project.
