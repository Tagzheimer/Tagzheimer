/*
 * gps_handler.h — Thin wrapper around TinyGPSPlus for NEO-6M (or any
 * NMEA-0183 GPS) on an ESP32 hardware UART.
 */
#pragma once
#ifndef TAGZHEIMER_GPS_HANDLER_H
#define TAGZHEIMER_GPS_HANDLER_H

#include <Arduino.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

#include "config.h"

struct GpsFix {
  bool valid;            // true if we have a usable lat/lon
  double latitude;       // decimal degrees
  double longitude;      // decimal degrees
  uint8_t satellites;    // satellite count
  float hdop;            // horizontal dilution of precision (lower = better)
  float altitude_m;      // meters above sea level
  float speed_kmph;      // ground speed
  uint16_t year;         // UTC
  uint8_t month;
  uint8_t day;
  uint8_t hour;
  uint8_t minute;
  uint8_t second;
};

class GpsHandler {
 public:
  // Initialise the UART and bring the GPS online.
  void begin();

  // Pump incoming NMEA bytes. Call this from loop() as often as possible.
  void update();

  // Block until a valid fix or timeout. Returns true on success.
  bool waitForFix(uint32_t timeoutSeconds, GpsFix& outFix);

  // Read the most recent fix (does NOT block).
  bool readLatest(GpsFix& outFix);

  // Number of characters discarded because they failed checksum, etc.
  uint32_t failedChecksums() const { return _failed; }

 private:
  TinyGPSPlus _gps;
  HardwareSerial _serial;
  uint32_t _failed = 0;
};

#endif  // TAGZHEIMER_GPS_HANDLER_H
