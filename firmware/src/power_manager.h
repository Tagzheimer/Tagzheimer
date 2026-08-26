/*
 * power_manager.h — Battery monitoring + deep sleep helpers.
 */
#pragma once
#ifndef TAGZHEIMER_POWER_MANAGER_H
#define TAGZHEIMER_POWER_MANAGER_H

#include <Arduino.h>
#include "config.h"

class PowerManager {
 public:
  void begin();

  // Read battery percentage (0-100). Returns -1 if disabled or unreadable.
  int readBatteryPercent();

  // Put the ESP32 into deep sleep for `seconds`. After wake, the ESP32
  // resets and runs setup() again — so this is effectively "end of cycle".
  void deepSleep(uint32_t seconds);

 private:
  float _adcToVolts(uint32_t raw);
};

#endif
