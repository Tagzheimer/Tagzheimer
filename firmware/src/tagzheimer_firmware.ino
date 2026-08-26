/*
 * Tagzheimer Firmware — ESP32-WROVER + NEO-6M GPS tracker
 * =======================================================
 *
 * Lifecycle (one cycle every UPDATE_INTERVAL_SECONDS):
 *   1.  Wake from deep sleep (or boot fresh)
 *   2.  Connect WiFi
 *   3.  Power up GPS, wait for a fix (up to GPS_FIX_TIMEOUT_SECONDS)
 *   4.  POST {deviceId, latitude, longitude} to /api/location/update
 *   5.  If POST fails, queue fix to NVS and try again next cycle
 *   6.  Disconnect WiFi, enter deep sleep until next cycle
 *
 * On the first boot the device also flushes any fixes queued from
 * previous offline cycles.
 *
 * Libraries required (Arduino IDE → Library Manager):
 *   - TinyGPSPlus              by Mikal Hart
 *   - ArduinoJson              by Benoit Blanchon  (v7+)
 *
 * Board: "ESP32 Wrover Kit (all versions)" or generic "ESP32 WROVER"
 *
 * Wiring: see docs/wiring.md
 *
 * Author: Tagzheimer team
 */

#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "secrets.h"
#include "gps_handler.h"
#include "wifi_manager.h"
#include "backend_client.h"
#include "status_led.h"
#include "power_manager.h"

GpsHandler      gps;
WifiManager     wifi;
BackendClient   backend;
StatusLED       led;
PowerManager    power;

// SOS button state (debounced)
static volatile bool s_sosTriggered = false;
static uint32_t      s_lastSosMs    = 0;

static void IRAM_ATTR onSosPressed() {
  uint32_t now = millis();
  if (now - s_lastSosMs > SOS_DEBOUNCE_MS) {
    s_sosTriggered = true;
    s_lastSosMs = now;
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);  // give the USB-CDC bridge a moment
  Serial.println();
  Serial.println("============================================");
  Serial.printf(" Tagzheimer firmware v2.0 — %s\n", DEVICE_NAME);
  Serial.printf(" Serial: %s\n", SERIAL_NUMBER);
  Serial.printf(" Backend: %s\n", BACKEND_URL);
  Serial.printf(" Update interval: %lus  Deep sleep: %s\n",
                UPDATE_INTERVAL_SECONDS,
                ENABLE_DEEP_SLEEP ? "ON" : "OFF");
  Serial.println("============================================");

  led.begin();
  led.setState(DeviceState::Booting);
  power.begin();
  backend.begin();

  // SOS button (uses BOOT button on GPIO 0 if SOS_BUTTON_PIN=0)
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(SOS_BUTTON_PIN, onSosPressed, FALLING);

  // 1. WiFi
  led.setState(DeviceState::ConnectingWiFi);
  bool wifiOk = wifi.connect();

  // 1.5. Pair with backend (v2 flow — uses SERIAL_NUMBER)
  if (wifiOk) {
    if (!backend.ensurePaired()) {
      if (DEBUG) Serial.println("[MAIN] pairing failed — will retry next cycle");
      led.setState(DeviceState::Error);
    }
  }

  // 2. GPS — start the UART and try to get a fix
  gps.begin();
  led.setState(DeviceState::SearchingGPS);

  GpsFix fix;
  bool fixOk = gps.waitForFix(GPS_FIX_TIMEOUT_SECONDS, fix);

  // 3. Send
  if (wifiOk && backend.accessToken().length() > 0) {
    if (fixOk) {
      led.setState(DeviceState::Sending);
      int battery = power.readBatteryPercent();
      SendResult r = backend.sendLocation(fix, (uint8_t)battery);
      if (DEBUG) {
        Serial.printf("[MAIN] sendLocation: success=%d http=%d queued=%d\n",
                      r.success, r.httpCode, r.queuedOffline);
      }
      // Always attempt to drain queued fixes from previous cycles
      backend.flushQueue();
      led.setState(r.success ? DeviceState::Online : DeviceState::Error);
    } else {
      if (DEBUG) Serial.println("[MAIN] no GPS fix — flushing queue only");
      backend.flushQueue();
      led.setState(DeviceState::Error);
    }
  } else {
    if (DEBUG) Serial.println("[MAIN] WiFi down or no token — fix will be queued on next cycle");
    led.setState(DeviceState::Error);
  }

  // Small grace period so the LED pattern is visible before sleep
  delay(2000);

  // Handle SOS (immediate re-send with a flag) — quick & dirty: trigger
  // a second location POST right away, then sleep.
  if (s_sosTriggered) {
    if (DEBUG) Serial.println("[MAIN] SOS pressed — sending immediate update");
    GpsFix latest;
    if (gps.readLatest(latest) && wifi.isConnected()) {
      // Re-use send path; you can extend the backend to recognise an SOS
      // flag in the `meta` field if you add a column for it.
      backend.sendLocation(latest, (uint8_t)power.readBatteryPercent());
    }
    s_sosTriggered = false;
  }

  // 4. Sleep until the next cycle
  wifi.disconnect();       // saves ~120 mA
  led.setState(DeviceState::Booting);
  power.deepSleep(UPDATE_INTERVAL_SECONDS);
}

void loop() {
  // With deep sleep, loop() never runs — every wake resets setup().
  // When ENABLE_DEEP_SLEEP=0 (debug), we spin here as a fallback.
  led.tick();
  delay(10);
}
