/*
 * secrets.example.h — copy this file to secrets.h and fill in your values.
 *
 *   cp secrets.example.h secrets.h
 *
 * secrets.h is git-ignored and contains the real WiFi credentials.
 * DO NOT commit secrets.h.
 */
#pragma once
#ifndef TAGZHEIMER_SECRETS_H
#define TAGZHEIMER_SECRETS_H

// Your 2.4 GHz WiFi SSID. (5 GHz only networks are not visible to ESP32.)
#define WIFI_SSID "your_wifi_ssid"

// Your WiFi password. Leave empty for open networks.
#define WIFI_PASSWORD "your_wifi_password"

#endif  // TAGZHEIMER_SECRETS_H
