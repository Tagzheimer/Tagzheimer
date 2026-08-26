/*
 * backend_client.cpp — v2 implementation.
 *
 * Stores the device pairing (deviceId + accessToken) in NVS so the
 * firmware survives deep sleep and reboots without re-pairing.
 */
#include "backend_client.h"

#include <Preferences.h>
#include <ArduinoJson.h>

static const char* kPrefNamespace = "tagz";
static const char* kPrefDeviceId  = "deviceId";
static const char* kPrefToken     = "accessToken";
static const char* kPrefQueueLen  = "qlen";
static const char* kPrefQueueKey  = "q";

#define MAX_QUEUE 10

// ---------------------------------------------------------------------------
void BackendClient::begin() {
  Preferences prefs;
  prefs.begin(kPrefNamespace, true);
  _deviceId    = prefs.getString(kPrefDeviceId, "");
  _accessToken = prefs.getString(kPrefToken, "");
  _queueSize   = prefs.getInt(kPrefQueueLen, 0);
  prefs.end();

  // Honour the compile-time override: if BACKEND_ACCESS_TOKEN is non-empty
  // in config.h, use it instead of any stored token.
  if (strlen(BACKEND_ACCESS_TOKEN) > 0) {
    _accessToken = String(BACKEND_ACCESS_TOKEN);
  }

  if (DEBUG) {
    Serial.printf("[NET] boot state: deviceId=%s token=%s queue=%d\n",
                  _deviceId.length() ? _deviceId.c_str() : "(none)",
                  _accessToken.length() ? "(set)" : "(none)",
                  _queueSize);
  }
}

// ---------------------------------------------------------------------------
void BackendClient::_storePairing(const String& deviceId, const String& accessToken) {
  _deviceId    = deviceId;
  _accessToken = accessToken;

  Preferences prefs;
  prefs.begin(kPrefNamespace, false);
  prefs.putString(kPrefDeviceId, deviceId);
  prefs.putString(kPrefToken, accessToken);
  prefs.end();
}

// ---------------------------------------------------------------------------
bool BackendClient::_doPair() {
  HTTPClient http;
  String url = String(BACKEND_URL) + String(BACKEND_PAIR_PATH);

  if (DEBUG) Serial.printf("[NET] pairing with %s ...\n", url.c_str());

  if (!http.begin(url)) {
    if (DEBUG) Serial.println("[NET] pair: http.begin failed");
    return false;
  }
  http.setConnectTimeout(BACKEND_TIMEOUT_MS);
  http.setTimeout(BACKEND_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer mock-token"); // demo mode shortcut

  JsonDocument req;
  req["serialNumber"] = SERIAL_NUMBER;
  req["name"]         = DEVICE_NAME;
  String body;
  serializeJson(req, body);

  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  if (code != 200) {
    if (DEBUG) Serial.printf("[NET] pair failed: code=%d body=%s\n", code, resp.c_str());
    return false;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, resp);
  if (err) {
    if (DEBUG) Serial.println("[NET] pair: JSON parse failed");
    return false;
  }

  String deviceId    = doc["deviceId"]    | "";
  String accessToken = doc["accessToken"] | "";
  if (deviceId.length() == 0 || accessToken.length() == 0) {
    if (DEBUG) Serial.println("[NET] pair: missing fields in response");
    return false;
  }

  _storePairing(deviceId, accessToken);

  if (DEBUG) {
    Serial.printf("[NET] paired! deviceId=%s token=%s...\n",
                  deviceId.c_str(),
                  accessToken.substring(0, 20).c_str());
  }
  return true;
}

// ---------------------------------------------------------------------------
bool BackendClient::ensurePaired() {
  if (_accessToken.length() > 0) return true;  // already paired
  return _doPair();
}

// ---------------------------------------------------------------------------
String BackendClient::_buildJson(const GpsFix& fix, uint8_t batteryPct) {
  JsonDocument doc;
  doc["serialNumber"] = SERIAL_NUMBER;
  doc["latitude"]     = fix.latitude;
  doc["longitude"]    = fix.longitude;

  JsonObject meta = doc.createNestedObject("meta");
  meta["satellites"] = fix.satellites;
  meta["hdop"]       = fix.hdop;
  meta["altitude"]   = fix.altitude_m;
  meta["speed"]      = fix.speed_kmph;
  meta["battery"]    = batteryPct;
  meta["source"]     = "esp32";
  meta["device"]     = DEVICE_NAME;

  String out;
  serializeJson(doc, out);
  return out;
}

// ---------------------------------------------------------------------------
bool BackendClient::_sendOnce(const String& json, int& httpCodeOut, String& bodyOut) {
  HTTPClient http;
  String url = String(BACKEND_URL) + String(BACKEND_UPDATE_PATH);

  if (!http.begin(url)) {
    if (DEBUG) Serial.println("[NET] http.begin failed");
    return false;
  }

  http.setConnectTimeout(BACKEND_TIMEOUT_MS);
  http.setTimeout(BACKEND_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + _accessToken);

  httpCodeOut = http.POST(json);
  bodyOut     = http.getString();
  http.end();

  return httpCodeOut == 201;
}

// ---------------------------------------------------------------------------
SendResult BackendClient::sendLocation(const GpsFix& fix, uint8_t batteryPct) {
  SendResult result = {false, 0, "", false};

  if (!ensurePaired()) {
    result.body = "Pairing failed";
    return result;
  }

  String json = _buildJson(fix, batteryPct);
  if (DEBUG) Serial.printf("[NET] sending: %s\n", json.c_str());

  for (int attempt = 1; attempt <= 3; ++attempt) {
    int  code = 0;
    String body;
    if (_sendOnce(json, code, body)) {
      result.success   = true;
      result.httpCode   = code;
      result.body       = body;
      flushQueue();
      return result;
    }
    result.httpCode = code;
    result.body     = body;

    // 401 → token revoked/expired → re-pair and retry once
    if (code == 401 && attempt == 1) {
      if (DEBUG) Serial.println("[NET] 401 → re-pairing");
      _accessToken = "";  // clear so ensurePaired re-pairs
      if (ensurePaired()) {
        continue;  // retry with new token
      }
      break;
    }

    // 4xx (non-401) → validation error, no point retrying
    if (code >= 400 && code < 500 && code != 408 && code != 429) break;

    if (attempt < 3) {
      if (DEBUG) Serial.printf("[NET] retry %d in %ds\n", attempt + 1, 1 << attempt);
      delay(1000 * (1 << attempt));
    }
  }

  // Queue for later
  if (_queueSize < MAX_QUEUE) {
    Preferences prefs;
    prefs.begin(kPrefNamespace, false);
    String key = String(kPrefQueueKey) + String((unsigned int)_queueSize);
    prefs.putString(key.c_str(), json);
    _queueSize++;
    prefs.putInt(kPrefQueueLen, _queueSize);
    prefs.end();
    result.queuedOffline = true;
    if (DEBUG) Serial.printf("[NET] queued offline (size=%d)\n", _queueSize);
  }

  return result;
}

// ---------------------------------------------------------------------------
int BackendClient::flushQueue() {
  if (_queueSize == 0) return 0;

  Preferences prefs;
  prefs.begin(kPrefNamespace, false);

  int sent = 0;
  int idx  = 0;
  while (idx < _queueSize) {
    String key = String(kPrefQueueKey) + String((unsigned int)idx);
    String json = prefs.getString(key.c_str(), "");
    if (json.length() == 0) { idx++; continue; }

    int  code = 0;
    String body;
    if (_sendOnce(json, code, body)) {
      sent++;
      prefs.remove(key.c_str());
    } else {
      break;
    }
    idx++;
  }

  // Compact queue
  int remaining = 0;
  for (int i = 0, j = 0; i < _queueSize; ++i) {
    String key = String(kPrefQueueKey) + String((unsigned int)i);
    String json = prefs.getString(key.c_str(), "");
    if (json.length() == 0) continue;
    if (j != i) {
      String newKey = String(kPrefQueueKey) + String((unsigned int)j);
      prefs.putString(newKey.c_str(), json);
      prefs.remove(key.c_str());
    }
    j++;
    remaining = j;
  }
  _queueSize = remaining;
  prefs.putInt(kPrefQueueLen, _queueSize);
  prefs.end();

  if (DEBUG && sent > 0) {
    Serial.printf("[NET] flushed %d queued fixes, %d still pending\n",
                  sent, _queueSize);
  }
  return sent;
}
