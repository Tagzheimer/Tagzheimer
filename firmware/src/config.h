/*
 * config.h — Tagzheimer firmware configuration (v2)
 * ---------------------------------------------------
 * Updated for v2 backend with easy pairing flow.
 *
 * Pairing flow:
 *   1. On first boot, BACKEND_ACCESS_TOKEN is empty → firmware calls
 *      POST /api/devices/pair with the configured SERIAL_NUMBER
 *   2. Backend returns { deviceId, accessToken }
 *   3. Firmware stores both in NVS (Preferences)
 *   4. Subsequent boots reuse the stored token
 *
 * Override the stored token at compile time by setting
 * BACKEND_ACCESS_TOKEN to a non-empty value (forces that token, skips
 * pairing).
 */

#pragma once
#ifndef TAGZHEIMER_CONFIG_H
#define TAGZHEIMER_CONFIG_H

// ---------------------------------------------------------------------------
// Device identity — the serial printed on the device.
// ---------------------------------------------------------------------------
// The backend uses this to resolve the deviceId. If no device with this
// serial exists, /pair will auto-provision one.
#define SERIAL_NUMBER  "TAG-001"
#define DEVICE_NAME     "Tagzheimer-001"

// ---------------------------------------------------------------------------
// Backend (Tagzheimer API v2)
// ---------------------------------------------------------------------------
// Use http:// for local testing — HTTPS requires a valid certificate OR
// the fingerprint mechanism described in backend_client.cpp.
#define BACKEND_URL      "http://192.168.1.50:5000"

// === Pairing ===
#define BACKEND_PAIR_PATH       "/api/devices/pair"
#define BACKEND_UPDATE_PATH     "/api/location/update"
#define BACKEND_BATCH_PATH      "/api/location/batch"

// Access token — leave empty to use the v2 pairing flow on first boot.
// Set to a Firebase user token or "mock-token" to skip pairing.
#define BACKEND_ACCESS_TOKEN   ""

// HTTP timeout (ms) for each request
#define BACKEND_TIMEOUT_MS      15000

// ---------------------------------------------------------------------------
// Update cadence
// ---------------------------------------------------------------------------
#define UPDATE_INTERVAL_SECONDS  300    // 5 min default; adjustable
#define GPS_FIX_TIMEOUT_SECONDS   90
#define GPS_MIN_SATS              4

// ---------------------------------------------------------------------------
// Hardware pins (ESP32-WROVER)
// ---------------------------------------------------------------------------
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD     9600

#define LED_PIN      2
#define LED_ON       HIGH
#define LED_OFF      LOW

#define SOS_BUTTON_PIN 0
#define SOS_DEBOUNCE_MS 250

#define BATTERY_ADC_PIN    35
#define BATTERY_DIVIDER_R1 100000.0f
#define BATTERY_DIVIDER_R2 100000.0f
#define BATTERY_ENABLE     1

#define ENABLE_DEEP_SLEEP 1

#define SERIAL_BAUD 115200
#define DEBUG true

#endif  // TAGZHEIMER_CONFIG_H
