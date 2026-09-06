import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Switch,
  Alert, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import styles from '../src/styles/theme';
import { colors } from '../src/styles/theme';
import { BracketCard } from '../src/components/BracketCard';
import {
  loadConfig, saveBackend, saveInterval, clearPairing,
  loadPrefs, savePrefs, resetPrefs, loadTrackingStatus,
  TrackerConfig, TrackerPrefs, GpsAccuracy,
} from '../src/services/storage';
import { pingBackend } from '../src/services/api';
import { reconfigureTask } from '../src/services/backgroundTask';

const INTERVAL_OPTIONS = [
  { label: '10s',   value: 10 },
  { label: '30s',   value: 30 },
  { label: '1m',    value: 60 },
  { label: '5m',    value: 300 },
  { label: '15m',   value: 900 },
];

const ACCURACY_OPTIONS: { label: string; value: GpsAccuracy; hint: string }[] = [
  { label: 'Saver',   value: 'saver',    hint: 'Coarse fixes · least battery' },
  { label: 'Balanced', value: 'balanced', hint: '~10m fixes · recommended' },
  { label: 'Precise',  value: 'precise',  hint: 'Best fixes · most battery' },
];

const DISTANCE_OPTIONS = [
  { label: 'Time only', value: 0 },
  { label: '5m',  value: 5 },
  { label: '25m', value: 25 },
  { label: '50m', value: 50 },
];

const FIX_MODE_OPTIONS: { label: string; value: 'efficient' | 'precise'; hint: string }[] = [
  { label: 'Efficient', value: 'efficient', hint: 'Reuses the free OS fix or a fresh cached one — powers the GPS only when needed. Best battery.' },
  { label: 'Precise',   value: 'precise',   hint: 'Always takes a fresh GPS fix. Most accurate, most battery.' },
];

const GPS_TIMEOUT_OPTIONS = [10, 15, 20, 30];

const QUEUE_OPTIONS = [25, 50, 100];
const BATTERY_THRESHOLD_OPTIONS = [10, 15, 20, 30];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.label, { marginBottom: 8, marginTop: 24 }]}>{children}</Text>;
}

function OptButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        backgroundColor: active ? colors.white : colors.surface,
        borderColor: active ? colors.white : colors.hairline2,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minWidth: 64,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{
        color: active ? colors.black : colors.ink2,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: 1.2,
      }}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.mono, { fontSize: 13, color: colors.ink, fontWeight: '700' }]}>{label}</Text>
        {hint ? <Text style={[styles.muted, { fontSize: 12, marginTop: 2 }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.hairline2, true: colors.white }}
        thumbColor={value ? colors.black : colors.ink3}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const [config, setConfig] = useState<TrackerConfig | null>(null);
  const [prefs, setPrefs] = useState<TrackerPrefs | null>(null);
  const [backend, setBackend] = useState('');
  const [intervalSec, setIntervalSec] = useState(60);
  const [health, setHealth] = useState<'pending' | 'ok' | 'bad' | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      const [cfg, p, st] = await Promise.all([loadConfig(), loadPrefs(), loadTrackingStatus()]);
      if (cancelled) return;
      setConfig(cfg);
      setPrefs(p);
      setBackend(cfg.backend);
      setIntervalSec(cfg.interval);
      setTrackingActive(st.state === 'running' || st.state === 'paused');
      setQueuedCount(st.queuedCount || 0);
      if (!cfg.accessToken) {
        router.replace('/');
      }
    })();
    return () => { cancelled = true; };
  }, []));

  useFocusEffect(useCallback(() => {
    if (!backend) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setHealth('pending');
      const r = await pingBackend(backend);
      if (!cancelled) setHealth(r.ok ? 'ok' : 'bad');
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [backend]));

  const flashSaved = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  /** Persist prefs + live-reconfigure the OS task when tracking is active. */
  const updatePrefs = async (patch: Partial<TrackerPrefs>, msg?: string) => {
    const next = await savePrefs(patch);
    setPrefs(next);
    if (trackingActive && (patch.accuracy !== undefined || patch.distanceInterval !== undefined)) {
      await reconfigureTask();
    }
    flashSaved(msg || 'Saved — applied immediately');
  };

  const handleSaveConnection = async () => {
    await saveBackend(backend);
    flashSaved('Backend saved — next fix uses it');
  };

  const handleSaveInterval = async () => {
    await saveInterval(intervalSec);
    setConfig((c) => (c ? { ...c, interval: intervalSec } : c));
    if (trackingActive) await reconfigureTask();
    flashSaved(trackingActive ? 'Interval saved — tracker reconfigured' : 'Interval saved');
  };

  const handleResetPrefs = () => {
    Alert.alert(
      'Reset preferences?',
      'Accuracy, movement filter, queue size, alerts and power options return to defaults. Backend URL and pairing are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const next = await resetPrefs();
            setPrefs(next);
            if (trackingActive) await reconfigureTask();
            flashSaved('Preferences reset to defaults');
          },
        },
      ]
    );
  };

  const handleUnpair = () => {
    Alert.alert(
      'Unpair device?',
      'This clears the access token and returns to the pairing screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            await clearPairing();
            router.replace('/');
          },
        },
      ]
    );
  };

  if (!config || !prefs) {
    return <View style={[styles.screen, styles.center]} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <BracketCard style={{ width: 40, height: 40, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.ink, fontSize: 18 }}>←</Text>
            </BracketCard>
          </TouchableOpacity>
          <Text style={styles.h2}>Settings</Text>
        </View>
        {savedMsg ? (
          <Text style={[styles.label, { color: colors.white, marginBottom: 8 }]}>{savedMsg}</Text>
        ) : (
          <Text style={[styles.label, { marginBottom: 8 }]}>CHANGES APPLY INSTANTLY</Text>
        )}

        {/* Connection */}
        <SectionTitle>CONNECTION</SectionTitle>
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          value={backend}
          onChangeText={setBackend}
          placeholder="http://10.0.2.2:5000"
          placeholderTextColor={colors.ink4}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: health === 'ok' ? colors.white : health === 'bad' ? colors.ink4 : colors.hairline2,
          }} />
          <Text style={styles.label}>
            {health === 'pending' && 'CHECKING…'}
            {health === 'ok' && 'BACKEND REACHABLE'}
            {health === 'bad' && 'BACKEND UNREACHABLE'}
            {health === null && 'BACKEND STATUS'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.button, { marginBottom: 4 }]} onPress={handleSaveConnection}>
          <Text style={styles.buttonText}>SAVE BACKEND</Text>
        </TouchableOpacity>

        {/* Tracking */}
        <SectionTitle>TRACKING · UPDATE INTERVAL</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {INTERVAL_OPTIONS.map(opt => (
            <OptButton key={opt.value} label={opt.label} active={intervalSec === opt.value} onPress={() => setIntervalSec(opt.value)} />
          ))}
        </View>
        {intervalSec < 60 && (
          <View style={{
            backgroundColor: colors.surface2,
            borderColor: colors.hairline2,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
          }}>
            <Text style={{ color: colors.ink, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
              ⚠ {intervalSec}s is below Android's 60s minimum for background tracking. Background tracking will fire every 60s. Foreground "Send Now" is unaffected.
            </Text>
          </View>
        )}
        <TouchableOpacity style={[styles.buttonSecondary, { marginBottom: 4 }]} onPress={handleSaveInterval}>
          <Text style={styles.buttonSecondaryText}>APPLY INTERVAL{trackingActive ? ' + RECONFIGURE' : ''}</Text>
        </TouchableOpacity>

        <SectionTitle>TRACKING · GPS ACCURACY</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {ACCURACY_OPTIONS.map(opt => (
            <OptButton key={opt.value} label={opt.label} active={prefs.accuracy === opt.value} onPress={() => updatePrefs({ accuracy: opt.value }, `Accuracy: ${opt.label}`)} />
          ))}
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 4 }]}>
          {ACCURACY_OPTIONS.find(o => o.value === prefs.accuracy)?.hint}
        </Text>

        <SectionTitle>TRACKING · FIX STRATEGY</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {FIX_MODE_OPTIONS.map(opt => (
            <OptButton key={opt.value} label={opt.label} active={prefs.fixMode === opt.value} onPress={() => updatePrefs({ fixMode: opt.value }, `Fix strategy: ${opt.label}`)} />
          ))}
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 4 }]}>
          {FIX_MODE_OPTIONS.find(o => o.value === prefs.fixMode)?.hint} Applies on the next fix — no restart needed.
        </Text>

        <SectionTitle>TRACKING · GPS TIMEOUT</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {GPS_TIMEOUT_OPTIONS.map(v => (
            <OptButton key={v} label={`${v}s`} active={prefs.gpsTimeoutSec === v} onPress={() => updatePrefs({ gpsTimeoutSec: v }, `GPS timeout: ${v}s`)} />
          ))}
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 4 }]}>
          Longest a single GPS acquisition may hold the radio on. On timeout the cycle falls back to the cached fix instead of draining.
        </Text>

        <SectionTitle>TRACKING · MOVEMENT FILTER</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {DISTANCE_OPTIONS.map(opt => (
            <OptButton key={opt.value} label={opt.label} active={prefs.distanceInterval === opt.value} onPress={() => updatePrefs({ distanceInterval: opt.value }, 'Movement filter updated')} />
          ))}
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 4 }]}>
          Minimum movement between fixes. “Time only” fires strictly on schedule.
        </Text>

        <SectionTitle>POWER</SectionTitle>
        <BracketCard style={{ marginBottom: 4 }}>
          <ToggleRow
            label="Auto-resume tracking"
            hint="Re-register after app kill or reboot (off = stay stopped)"
            value={prefs.autoResume}
            onChange={(v) => updatePrefs({ autoResume: v }, v ? 'Auto-resume on' : 'Auto-resume off')}
          />
        </BracketCard>
        <TouchableOpacity
          style={[styles.buttonSecondary, { marginTop: 12 }]}
          onPress={() => {
            if (Platform.OS === 'android') {
              Linking.openSettings().catch(() => {
                Alert.alert('Could not open settings', 'Open Settings → Apps → Tagzheimer Tracker → Battery → Unrestricted');
              });
            }
          }}
        >
          <Text style={styles.buttonSecondaryText}>OPEN ANDROID BATTERY SETTINGS</Text>
        </TouchableOpacity>

        {/* Alerts */}
        <SectionTitle>ALERTS</SectionTitle>
        <BracketCard style={{ marginBottom: 4 }}>
          <ToggleRow
            label="Connection failure alerts"
            hint="Notify after 3 consecutive failed sends"
            value={prefs.failureAlerts}
            onChange={(v) => updatePrefs({ failureAlerts: v })}
          />
          <View style={[styles.divider, { marginVertical: 4 }]} />
          <ToggleRow
            label="Low-battery alerts"
            hint="Notify once per session when crossing the threshold"
            value={prefs.batteryAlerts}
            onChange={(v) => updatePrefs({ batteryAlerts: v })}
          />
        </BracketCard>
        <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>LOW-BATTERY THRESHOLD</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {BATTERY_THRESHOLD_OPTIONS.map(v => (
            <OptButton key={v} label={`${v}%`} active={prefs.batteryThreshold === v} onPress={() => updatePrefs({ batteryThreshold: v }, `Low-battery threshold: ${v}%`)} />
          ))}
        </View>

        {/* Offline queue */}
        <SectionTitle>OFFLINE QUEUE · MAX FIXES ({queuedCount} QUEUED)</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {QUEUE_OPTIONS.map(v => (
            <OptButton key={v} label={String(v)} active={prefs.queueLimit === v} onPress={() => updatePrefs({ queueLimit: v }, `Queue holds up to ${v} fixes`)} />
          ))}
        </View>
        <Text style={[styles.muted, { fontSize: 12, marginBottom: 4 }]}>
          Failed sends are held in memory and synced via the batch endpoint on the next success. Oldest fixes drop first when full.
        </Text>

        {/* Device info */}
        <SectionTitle>DEVICE</SectionTitle>
        <BracketCard style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={[styles.label, { flex: 1 }]}>SERIAL</Text>
            <Text style={[styles.value, { flex: 1.5, textAlign: 'right' }]}>{config.serial || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={[styles.label, { flex: 1 }]}>DEVICE ID</Text>
            <Text style={[styles.mono, { flex: 1.5, fontSize: 11, color: colors.ink3, textAlign: 'right' }]}>
              {config.deviceId?.slice(0, 24)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[styles.label, { flex: 1 }]}>TOKEN</Text>
            <Text style={[styles.mono, { flex: 1.5, fontSize: 11, color: colors.ink3, textAlign: 'right' }]}>
              {config.accessToken ? '••••••••' + config.accessToken.slice(-6) : '—'}
            </Text>
          </View>
        </BracketCard>

        {/* Reset prefs */}
        <TouchableOpacity
          style={[styles.buttonSecondary, { marginBottom: 12 }]}
          onPress={handleResetPrefs}
        >
          <Text style={styles.buttonSecondaryText}>RESET PREFERENCES</Text>
        </TouchableOpacity>

        {/* Unpair */}
        <TouchableOpacity
          style={[styles.buttonSecondary, { borderColor: colors.hairline3 }]}
          onPress={handleUnpair}
        >
          <Text style={[styles.buttonSecondaryText, { color: colors.ink2 }]}>UNPAIR DEVICE</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
