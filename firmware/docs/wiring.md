# Wiring Guide — ESP32-WROVER + NEO-6M GPS

## Pin Map

### GPS Module (NEO-6M)

| NEO-6M pin | ESP32-WROVER pin | Notes |
|------------|------------------|-------|
| VCC        | 3V3              | NEVER 5 V — NEO-6M is 3.3 V only |
| GND        | GND              | |
| TX         | GPIO 16 (RX)     | ESP32 receives; configure as UART1 RX |
| RX         | GPIO 17 (TX)     | ESP32 transmits; configure as UART1 TX |
| PPS        | (not connected)  | Pulse-per-second output, unused |

These pins are configured in `config.h`:

```cpp
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
```

### Status LED

| Component | ESP32 pin |
|-----------|-----------|
| LED anode (+) | GPIO 2 via 330 Ω resistor |
| LED cathode (−) | GND |

GPIO 2 is the onboard LED on most ESP32 DevKits — you can use that and skip the external LED entirely.

### SOS Button (optional)

| Button | ESP32 pin |
|--------|-----------|
| One side | GPIO 0 (BOOT button) |
| Other side | GND |

GPIO 0 is the BOOT button on most DevKits — using it for SOS means you don't need to wire a separate button during development. Internal pull-up is enabled in firmware.

### Battery Voltage Divider (optional)

```
   Battery +
      │
      ├──── 100 kΩ ────┬──── GPIO 35 (ADC1_CH7)
      │                │
      │              100 kΩ
      │                │
     GND              GND
```

This halves a 4.2 V LiPo down to 2.1 V — safely within the ESP32 ADC's 0–3.3 V range. Configure in `config.h`:

```cpp
#define BATTERY_ENABLE     1
#define BATTERY_ADC_PIN    35
#define BATTERY_DIVIDER_R1 100000.0f
#define BATTERY_DIVIDER_R2 100000.0f
```

### Battery Power

| Battery | ESP32 pin |
|---------|-----------|
| LiPo + (3.7 V) | `BAT` or `VBAT` pin (if your board has a TP4056 charger) |
| LiPo − | GND |

If your DevKit has a USB-C connector and a LiPo charging IC (e.g. TTGO series), you can leave USB plugged in for charging and the LiPo takes over automatically when USB is unplugged.

> **Avoid** connecting a raw LiPo directly to the 3V3 pin — that bypasses the regulator and will fry the ESP32. Always go through a regulator or the dedicated battery input.

---

## ASCII Schematic

```
                   ESP32-WROVER DevKit
                  ┌────────────────────┐
                  │                    │
   NEO-6M VCC ────┤ 3V3                │
   NEO-6M GND ────┤ GND                │
   NEO-6M TX  ────┤ GPIO 16  (UART1 RX)│
   NEO-6M RX  ────┤ GPIO 17  (UART1 TX)│
                  │                    │
   LED + 330Ω ────┤ GPIO 2             │
   LED −      ────┤ GND                │
                  │                    │
   SOS button ────┤ GPIO 0 (BOOT)      │
   SOS button ────┤ GND                │
                  │                    │
   Bat divider ───┤ GPIO 35 (ADC1_CH7) │
                  │                    │
   LiPo + ────────┤ VBAT / BAT pin     │
   LiPo − ────────┤ GND                │
                  │                    │
   USB-C  ────────┤ USB (power+flash)  │
                  └────────────────────┘
```

---

## Why these specific pins?

The ESP32 has several "gotcha" pins that we deliberately avoid:

| Pin(s) | Why we avoid |
|--------|--------------|
| GPIO 0, 2, 5, 12, 15 | Strapping pins — used at boot to select boot mode. Wiring peripherals here can prevent the ESP32 from booting. (GPIO 0 and 2 are used here only for inputs/outputs that don't conflict: BOOT button + onboard LED.) |
| GPIO 6–11 | Wired to the SPI flash — using them will crash the firmware. |
| GPIO 12 | If pulled high at boot, internal flash voltage becomes 1.8 V instead of 3.3 V — most modules won't boot. |
| ADC2 pins (GPIO 0, 2, 4, 12–15, 25–27) | ADC2 is disabled when WiFi is on. We use **GPIO 35** which is on ADC1 — safe to use alongside WiFi. |
| GPIO 34, 35, 36, 39 | Input-only. Fine for ADC and button inputs. |

GPIO 16 and 17 are output-safe, not strapping pins, and not used by flash — perfect for UART1.

---

## First Boot Checklist

1. ✅ WiFi SSID and password in `secrets.h` (2.4 GHz network!)
2. ✅ `DEVICE_ID` in `config.h` matches a device in your backend
3. ✅ `BACKEND_URL` is reachable from the ESP32's network (not `localhost`)
4. ✅ `AUTH_TOKEN` is `mock-token` (demo mode) or a real Firebase token (prod)
5. ✅ GPS antenna has a clear view of the sky for the first cold start (≤ 30 s)
6. ✅ USB cable is data-capable (some cheap cables are power-only)
7. ✅ Serial Monitor set to 115200 baud
8. ✅ `ENABLE_DEEP_SLEEP = 0` while debugging (so you can read serial between cycles)

---

## Common Mistakes

### 1. Powering NEO-6M from 5V

The NEO-6M is rated for 3.3 V. Some cheap breakout boards have an onboard regulator and tolerate 5 V on VCC, but many don't. **Always use 3V3** to be safe.

### 2. Swapping TX and RX

This is the #1 cause of "GPS shows 0 satellites forever". The naming is from the perspective of the device, so:

- NEO-6M **TX** → ESP32 **RX** (GPIO 16)
- NEO-6M **RX** → ESP32 **TX** (GPIO 17)

If your GPS never gets a fix and you're outdoors with a clear sky, swap these two wires first.

### 3. 5 GHz WiFi

ESP32 only supports 2.4 GHz. Most dual-band routers expose both, but some hide the 2.4 GHz SSID. Check your router settings.

### 4. Indoor GPS

GPS needs a clear view of the sky. Through 1–2 walls it might work but take 5+ minutes; in a basement it simply won't work. Test outside first.

### 5. Battery + USB at the same time

If your DevKit has a LiPo charging IC, this is fine — USB charges the LiPo, LiPo powers the board. If your DevKit does NOT have a charger, never connect both at once — backfeeding can damage the USB port.
