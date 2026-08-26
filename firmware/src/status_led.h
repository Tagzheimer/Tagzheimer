/*
 * status_led.h — Blink-pattern LED indicator for device state.
 */
#pragma once
#ifndef TAGZHEIMER_STATUS_LED_H
#define TAGZHEIMER_STATUS_LED_H

#include <Arduino.h>

enum class DeviceState {
  Booting,
  ConnectingWiFi,
  SearchingGPS,
  Online,
  Sending,
  Error,
  SOS
};

class StatusLED {
 public:
  void begin();
  void setState(DeviceState s);
  void tick();  // call from loop()
 private:
  DeviceState _state = DeviceState::Booting;
  uint32_t    _lastToggle = 0;
  bool        _ledOn = false;
  void _blink(uint32_t onMs, uint32_t offMs);
};

#endif
