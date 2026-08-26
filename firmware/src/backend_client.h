/*
 * backend_client.h — v2 backend client for the Tagzheimer firmware.
 *
 * Lifecycle:
 *   1. ensurePaired() — checks NVS for stored token; if missing, calls
 *      POST /api/devices/pair with SERIAL_NUMBER and stores the result.
 *   2. sendLocation(fix) — POST /api/location/update with the stored
 *      token. On 401 (token expired/revoked), re-pairs automatically.
 *   3. flushQueue() — drains any fixes that failed to send previously.
 */
#pragma once
#ifndef TAGZHEIMER_BACKEND_CLIENT_H
#define TAGZHEIMER_BACKEND_CLIENT_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "gps_handler.h"

struct SendResult {
  bool success;
  int  httpCode;
  String body;
  bool queuedOffline;
};

class BackendClient {
 public:
  // Initialize from NVS. Sets _accessToken / _deviceId if previously paired.
  void begin();

  // Ensure we have a valid access token. Calls /pair if needed.
  // Returns true on success.
  bool ensurePaired();

  // Send a GPS fix. Uses the stored token; on 401, re-pairs and retries.
  SendResult sendLocation(const GpsFix& fix, uint8_t batteryPct = 100);

  // Try to drain queued fixes. Returns count successfully sent.
  int flushQueue();

  // Number of fixes currently queued.
  int queueSize() const { return _queueSize; }

  // The current access token (for debugging).
  String accessToken() const { return _accessToken; }
  String deviceId()    const { return _deviceId; }

 private:
  String _accessToken;
  String _deviceId;
  int    _queueSize = 0;

  bool _sendOnce(const String& json, int& httpCodeOut, String& bodyOut);
  String _buildJson(const GpsFix& fix, uint8_t batteryPct);
  bool _doPair();
  void _storePairing(const String& deviceId, const String& accessToken);
};

#endif  // TAGZHEIMER_BACKEND_CLIENT_H
