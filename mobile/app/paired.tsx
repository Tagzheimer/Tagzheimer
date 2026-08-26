import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Linking, Platform, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import styles from '../src/styles/theme';
import { colors } from '../src/styles/theme';
import { BracketCard } from '../src/components/BracketCard';
import { StatusPill } from '../src/components/StatusPill';
import {
  loadConfig, clearPairing, loadTrackingStatus,
  TrackerConfig, TrackingStatus,
} from '../src/services/storage';
import {
  startTracking, pauseTracking, resumeTracking, stopTracking,
  subscribeToStatus,
} from '../src/services/backgroundTask';
import { withWakeLock, getBatteryState } from '../src/services/powerManagement';
import { sendFix, GpsFix } from '../src/services/api';
import * as Location from 'expo-location';

function fmtTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '—';
  const sec = Math.floor((Date.now() - ms) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function TrackerScreen() {
  const [config, setConfig] = useState<TrackerConfig | null>(null);
  const [status, setStatus] = useState<TrackingStatus | null>(null);
  const [battery, setBattery] = useState<{ level: number; isCharging: boolean } | null>(null);
  const [sendingNow, setSendingNow] = useState(false);

  // Load config + status on focus
  useFocusEffect(useCallback(() => {
    (async () => {
      const cfg = await loadConfig();
      if (!cfg.accessToken || !cfg.deviceId) {
        router.replace('/');
        return;
      }
      setConfig(cfg);
      const currentStatus = await loadTrackingStatus();
      setStatus(currentStatus);

      // Subscribe to status updates from background task
      const unsubscribe = subscribeToStatus((next) => {
        setStatus(next);
      });

      const bat = await getBatteryState();
      setBattery({ level: bat.level, isCharging: bat.isCharging });

      // Poll battery every 30s
      const batTimer = setInterval(async () => {
        const b = await getBatteryState();
        setBattery({ level: b.level, isCharging: b.isCharging });
      }, 30000);

      return () => {
        unsubscribe();
        clearInterval(batTimer);
      };
    })();
  }, []));

  // === Actions ===

  const handleStart = async () => {
    if (!config) return;
    const result = await startTracking();
    if (!result.ok) {
      Alert.alert('Failed to start tracking', result.error || 'Unknown error');
    }
  };

  const handlePause = async () => {
    await pauseTracking();
  };

  const handleResume = async () => {
    await resumeTracking();
  };

  const handleStop = () => {
    Alert.alert(
      'Stop tracking?',
      'This will stop all background tracking and dismiss the persistent notification. You can start it again from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => stopTracking() },
      ]
    );
  };

  const handleSendNow = async () => {
    if (!config) return;
    setSendingNow(true);
    await withWakeLock(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,  // ~10m accuracy, much less battery drain than BestForNavigation
        });
        const fix: GpsFix = {
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date(loc.timestamp).toISOString(),
          accuracy:  loc.coords.accuracy  ?? null,
          altitude:  loc.coords.altitude  ?? null,
          speed:      loc.coords.speed      ?? null,
        };
        const bat = await getBatteryState();
        const result = await sendFix(config, fix, bat.level);
        if (result.success) {
          Alert.alert('Sent', 'GPS fix sent to backend');
        } else {
          Alert.alert('Send failed', result.error || 'Unknown error');
        }
      } catch (err: any) {
        Alert.alert('GPS error', err?.message || 'Could not get location');
      }
    });
    setSendingNow(false);
  };

  const handleBatteryOptimization = () => {
    // Open Android battery optimization settings so user can exempt the app
    if (Platform.OS === 'android') {
      Linking.openSettings().catch(() => {
        Alert.alert('Could not open settings', 'Open Settings → Apps → Tagzheimer Tracker → Battery → Unrestricted');
      });
    }
  };

  if (!config || !status) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.white} size="small" />
      </View>
    );
  }

  const isRunning = status.state === 'running';
  const isPaused = status.state === 'paused';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>TRACKER</Text>
          <Text style={[styles.h1, { fontSize: 24, marginTop: 4 }]}>
            {config.serial}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <BracketCard style={{ width: 48, height: 48, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>⋯</Text>
          </BracketCard>
        </TouchableOpacity>
      </View>

      {/* Tracking status card */}
      <BracketCard style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.label}>TRACKING STATUS</Text>
          <StatusPill
            online={isRunning}
            label={isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : 'STOPPED'}
          />
        </View>

        {status.startedAt ? (
          <View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={[styles.label, { flex: 1 }]}>UPTIME</Text>
              <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>
                {fmtDuration(status.startedAt)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={[styles.label, { flex: 1 }]}>LAST FIX</Text>
              <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>
                {fmtTime(status.lastFixAt)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={[styles.label, { flex: 1 }]}>LAST SEND</Text>
              <Text style={[styles.value, { flex: 1.5, textAlign: 'right', color: status.lastSendOk === false ? colors.ink3 : colors.ink }]}>
                {fmtTime(status.lastSendAt)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={[styles.label, { flex: 1 }]}>SENT / FAILED</Text>
              <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>
                {status.totalSent || 0} / {status.totalFailed || 0}
              </Text>
            </View>
            {status.queuedCount > 0 && (
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={[styles.label, { flex: 1 }]}>QUEUED OFFLINE</Text>
                <Text style={[styles.value, { flex: 1.5, textAlign: 'right', color: colors.ink3 }]}>
                  {status.queuedCount}
                </Text>
              </View>
            )}
            {status.lastError && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.label, { flex: 1 }]}>ERROR</Text>
                <Text style={[styles.value, { flex: 2, textAlign: 'right', color: colors.ink3, fontSize: 11 }]}>
                  {status.lastError.slice(0, 80)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.muted, { textAlign: 'center', paddingVertical: 16 }]}>
            Tracking is not active. Tap Start below.
          </Text>
        )}
      </BracketCard>

      {/* Battery + interval cards */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <BracketCard style={{ flex: 1, padding: 16 }}>
          <Text style={styles.label}>BATTERY</Text>
          <Text style={[styles.h2, { marginTop: 8, fontSize: 24, color: battery && battery.level < 20 ? colors.ink3 : colors.ink }]}>
            {battery?.level ?? '—'}%
          </Text>
          {battery?.isCharging && (
            <Text style={[styles.label, { marginTop: 4, color: colors.white }]}>CHARGING</Text>
          )}
        </BracketCard>
        <BracketCard style={{ flex: 1, padding: 16 }}>
          <Text style={styles.label}>INTERVAL</Text>
          <Text style={[styles.h2, { marginTop: 8, fontSize: 24 }]}>
            {config.interval}s
          </Text>
          <Text style={[styles.label, { marginTop: 4 }]}>IN BG</Text>
        </BracketCard>
      </View>

      {/* Primary action button */}
      {!isRunning && !isPaused && (
        <TouchableOpacity
          onPress={handleStart}
          style={[styles.button, { marginBottom: 12 }]}
        >
          <Text style={styles.buttonText}>START TRACKING</Text>
        </TouchableOpacity>
      )}

      {isRunning && (
        <TouchableOpacity
          onPress={handlePause}
          style={[styles.buttonSecondary, { marginBottom: 12 }]}
        >
          <Text style={styles.buttonSecondaryText}>PAUSE TRACKING</Text>
        </TouchableOpacity>
      )}

      {isPaused && (
        <TouchableOpacity
          onPress={handleResume}
          style={[styles.button, { marginBottom: 12 }]}
        >
          <Text style={styles.buttonText}>RESUME TRACKING</Text>
        </TouchableOpacity>
      )}

      {(isRunning || isPaused) && (
        <TouchableOpacity
          onPress={handleStop}
          style={[styles.buttonSecondary, { marginBottom: 12, borderColor: colors.hairline3 }]}
        >
          <Text style={[styles.buttonSecondaryText, { color: colors.ink2 }]}>STOP TRACKING</Text>
        </TouchableOpacity>
      )}

      {/* Send now (manual override) */}
      <TouchableOpacity
        onPress={handleSendNow}
        disabled={sendingNow}
        style={[styles.buttonSecondary, sendingNow && { opacity: 0.5 }, { marginBottom: 24 }]}
      >
        {sendingNow ? (
          <>
            <ActivityIndicator color={colors.ink} size="small" />
            <Text style={styles.buttonSecondaryText}>SENDING…</Text>
          </>
        ) : (
          <Text style={styles.buttonSecondaryText}>SEND FIX NOW</Text>
        )}
      </TouchableOpacity>

      {/* Power management card */}
      <BracketCard style={{ marginBottom: 12 }}>
        <Text style={[styles.label, { marginBottom: 12 }]}>POWER MANAGEMENT</Text>
        <Text style={[styles.body, { color: colors.ink2, fontSize: 13, marginBottom: 12, lineHeight: 20 }]}>
          For reliable background tracking, disable battery optimization for this app. Android will otherwise suspend tracking after a few minutes of inactivity.
        </Text>
        <TouchableOpacity
          onPress={handleBatteryOptimization}
          style={[styles.buttonSecondary, { marginBottom: 8 }]}
        >
          <Text style={styles.buttonSecondaryText}>OPEN ANDROID SETTINGS</Text>
        </TouchableOpacity>
        <Text style={[styles.muted, { fontSize: 11 }]}>
          Path: Apps → Tagzheimer Tracker → Battery → Unrestricted
        </Text>
      </BracketCard>

      {/* Info card */}
      <BracketCard>
        <Text style={[styles.label, { marginBottom: 8 }]}>HOW IT WORKS</Text>
        <Text style={[styles.body, { color: colors.ink2, fontSize: 13, lineHeight: 20 }]}>
          • The tracker runs as an Android foreground service{'\n'}
          • A persistent notification stays in the tray while tracking{'\n'}
          • GPS fixes are sent every {config.interval}s{'\n'}
          • Failed sends are queued and synced when the backend is reachable{'\n'}
          • The app can be swiped away — tracking continues{'\n'}
          • The notification has PAUSE / RESUME / STOP action buttons
        </Text>
      </BracketCard>
    </ScrollView>
  );
}
