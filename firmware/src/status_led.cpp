#include "status_led.h"
#include "config.h"

void StatusLED::begin() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);
}

void StatusLED::setState(DeviceState s) {
  _state = s;
  // Reset to a known state on transition so the new pattern starts cleanly
  _ledOn = false;
  digitalWrite(LED_PIN, LED_OFF);
  _lastToggle = millis();
}

void StatusLED::_blink(uint32_t onMs, uint32_t offMs) {
  uint32_t now = millis();
  if (_ledOn && now - _lastToggle >= onMs) {
    _ledOn = false;
    digitalWrite(LED_PIN, LED_OFF);
    _lastToggle = now;
  } else if (!_ledOn && now - _lastToggle >= offMs) {
    _ledOn = true;
    digitalWrite(LED_PIN, LED_ON);
    _lastToggle = now;
  }
}

void StatusLED::tick() {
  switch (_state) {
    case DeviceState::Booting:         _blink(100, 100);  break;  // fast double-ish
    case DeviceState::ConnectingWiFi:  _blink(250, 250);  break;  // medium blink
    case DeviceState::SearchingGPS:    _blink(500, 500);  break;  // slow blink
    case DeviceState::Online:          _blink(50, 1950);  break;  // short heartbeat
    case DeviceState::Sending:         _blink(100, 100);  break;  // fast
    case DeviceState::Error:           _blink(1000, 1000);break;  // very slow
    case DeviceState::SOS:             _blink(50, 50);    break;  // solid-ish fast
  }
}
