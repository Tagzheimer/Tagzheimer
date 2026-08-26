/*
 * wifi_manager.h — Minimal WiFi connect helper (no captive portal for now).
 */
#pragma once
#ifndef TAGZHEIMER_WIFI_MANAGER_H
#define TAGZHEIMER_WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "secrets.h"

class WifiManager {
 public:
  // Connect to WiFi using WIFI_SSID/WIFI_PASSWORD from secrets.h.
  // Returns true on success, false on timeout.
  bool connect(uint32_t timeoutMs = 20000);

  // True iff currently connected.
  bool isConnected() { return WiFi.status() == WL_CONNECTED; }

  // Disconnect and turn off WiFi to save power (call before deep sleep).
  void disconnect() {
    WiFi.disconnect(true, true);
    WiFi.mode(WIFI_OFF);
  }
};

#endif
