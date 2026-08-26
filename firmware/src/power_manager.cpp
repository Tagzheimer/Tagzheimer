#include "power_manager.h"

// ESP32 ADC reference voltage
#define ADC_VREF 3.3f
#define ADC_MAX  4095.0f

void PowerManager::begin() {
#if BATTERY_ENABLE
  analogReadResolution(12);
  // ADC1 channels are safe to use while WiFi is on (ADC2 is not).
  // GPIO 35 = ADC1_CH7 — no pinMode() needed for input-only pins.
  if (DEBUG) Serial.println("[PWR] battery monitoring enabled");
#else
  if (DEBUG) Serial.println("[PWR] battery monitoring disabled");
#endif
}

float PowerManager::_adcToVolts(uint32_t raw) {
  float v_adc = (raw / ADC_MAX) * ADC_VREF;
  float v_bat = v_adc * ((BATTERY_DIVIDER_R1 + BATTERY_DIVIDER_R2) / BATTERY_DIVIDER_R2);
  return v_bat;
}

int PowerManager::readBatteryPercent() {
#if !BATTERY_ENABLE
  return -1;
#else
  // Average 8 readings to reduce noise
  uint32_t sum = 0;
  for (int i = 0; i < 8; ++i) {
    sum += analogRead(BATTERY_ADC_PIN);
    delay(2);
  }
  float v = _adcToVolts(sum / 8);

  // Rough LiPo curve: 4.2V = 100%, 3.0V = 0%
  int pct = (int)((v - 3.0f) / (4.2f - 3.0f) * 100.0f);
  if (pct < 0)   pct = 0;
  if (pct > 100) pct = 100;

  if (DEBUG) Serial.printf("[PWR] battery: %.2f V (%d%%)\n", v, pct);
  return pct;
#endif
}

void PowerManager::deepSleep(uint32_t seconds) {
#if ENABLE_DEEP_SLEEP
  if (DEBUG) {
    Serial.printf("[PWR] entering deep sleep for %lus... good night.\n", seconds);
    Serial.flush();
  }
  // ESP32 deep sleep uses microsecond resolution.
  esp_sleep_enable_timer_wakeup((uint64_t)seconds * 1000000ULL);
  esp_deep_sleep_start();
  // Code never reaches here — the device resets on wake.
#else
  if (DEBUG) Serial.printf("[PWR] deep sleep disabled — delaying %lus\n", seconds);
  delay(seconds * 1000UL);
#endif
}
