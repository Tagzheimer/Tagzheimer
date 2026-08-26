#include "wifi_manager.h"

bool WifiManager::connect(uint32_t timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) return true;

  if (DEBUG) Serial.printf("[WIFI] connecting to \"%s\"...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(200);
  }

  if (WiFi.status() == WL_CONNECTED) {
    if (DEBUG) {
      Serial.printf("[WIFI] connected! IP=%s RSSI=%d dBm\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return true;
  }

  if (DEBUG) Serial.println("[WIFI] connect timeout");
  return false;
}
