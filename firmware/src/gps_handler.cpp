/*
 * gps_handler.cpp — see gps_handler.h for documentation.
 */
#include "gps_handler.h"

void GpsHandler::begin() {
  // Use UART1 — UART0 is wired to USB-CDC and shared with the Serial monitor.
  _serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  if (DEBUG) {
    Serial.printf("[GPS] UART1 started @ %u baud (RX=%d TX=%d)\n",
                  GPS_BAUD, GPS_RX_PIN, GPS_TX_PIN);
  }
}

void GpsHandler::update() {
  while (_serial.available()) {
    int c = _serial.read();
    if (!_gps.encode(c)) {
      // encode() returns false for chars that didn't complete a sentence —
      // that's normal. But if checksum failed, the library sets an internal
      // flag and we can detect it indirectly via charsPassed / failedCS.
      // TinyGPSPlus exposes this via statistics() — track it.
    }
  }
  // TinyGPSPlus has no direct "failed checksum" counter exposed in the API,
  // but we can derive a proxy: number of chars processed vs sentences with
  // errors. We keep this simple for now — _failed stays 0 unless you wire
  // TinyGPSPlus::statistics() yourself.
}

bool GpsHandler::waitForFix(uint32_t timeoutSeconds, GpsFix& outFix) {
  uint32_t start = millis();
  uint32_t timeoutMs = timeoutSeconds * 1000UL;

  if (DEBUG) {
    Serial.printf("[GPS] waiting for fix (timeout %lus, min sats %u)\n",
                  timeoutSeconds, GPS_MIN_SATS);
  }

  while (millis() - start < timeoutMs) {
    update();

    if (_gps.location.isValid() && _gps.satellites.isValid() &&
        _gps.satellites.value() >= (int)GPS_MIN_SATS) {
      outFix.valid      = true;
      outFix.latitude   = _gps.location.lat();
      outFix.longitude  = _gps.location.lng();
      outFix.satellites = (uint8_t)_gps.satellites.value();
      outFix.hdop       = _gps.hdop.isValid() ? _gps.hdop.hdop() : 99.0f;
      outFix.altitude_m = _gps.altitude.isValid() ? _gps.altitude.meters() : 0.0f;
      outFix.speed_kmph = _gps.speed.isValid() ? _gps.speed.kmph() : 0.0f;

      if (_gps.date.isValid() && _gps.time.isValid()) {
        outFix.year   = _gps.date.year();
        outFix.month  = _gps.date.month();
        outFix.day    = _gps.date.day();
        outFix.hour   = _gps.time.hour();
        outFix.minute = _gps.time.minute();
        outFix.second = _gps.time.second();
      } else {
        outFix.year = 0;
      }

      if (DEBUG) {
        Serial.printf("[GPS] FIX acquired: lat=%.6f lon=%.6f sats=%u hdop=%.2f\n",
                      outFix.latitude, outFix.longitude,
                      outFix.satellites, outFix.hdop);
      }
      return true;
    }

    // Brief LED blink so the user sees "GPS searching" activity
    static uint32_t lastBlink = 0;
    if (millis() - lastBlink > 500) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastBlink = millis();
    }
  }

  if (DEBUG) Serial.println("[GPS] FIX timeout — no valid position");
  outFix.valid = false;
  return false;
}

bool GpsHandler::readLatest(GpsFix& outFix) {
  update();
  if (!_gps.location.isValid()) {
    outFix.valid = false;
    return false;
  }
  outFix.valid      = true;
  outFix.latitude   = _gps.location.lat();
  outFix.longitude  = _gps.location.lng();
  outFix.satellites = _gps.satellites.isValid() ? (uint8_t)_gps.satellites.value() : 0;
  outFix.hdop       = _gps.hdop.isValid() ? _gps.hdop.hdop() : 99.0f;
  outFix.altitude_m = _gps.altitude.isValid() ? _gps.altitude.meters() : 0.0f;
  outFix.speed_kmph = _gps.speed.isValid() ? _gps.speed.kmph() : 0.0f;
  return true;
}
