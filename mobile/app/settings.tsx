import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import styles from '../src/styles/theme';
import { colors } from '../src/styles/theme';
import { BracketCard } from '../src/components/BracketCard';
import { loadConfig, saveBackend, saveInterval, clearPairing, TrackerConfig } from '../src/services/storage';
import { pingBackend } from '../src/services/api';

const INTERVAL_OPTIONS = [
  { label: '10s',   value: 10 },
  { label: '30s',   value: 30 },
  { label: '1m',    value: 60 },
  { label: '5m',    value: 300 },
  { label: '15m',   value: 900 },
];

export default function SettingsScreen() {
  const [config, setConfig] = useState<TrackerConfig | null>(null);
  const [backend, setBackend] = useState('');
  const [intervalSec, setIntervalSec] = useState(60);
  const [health, setHealth] = useState<'pending' | 'ok' | 'bad' | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const cfg = await loadConfig();
      setConfig(cfg);
      setBackend(cfg.backend);
      setIntervalSec(cfg.interval);
      if (!cfg.accessToken) {
        router.replace('/');
      }
    })();
  }, []));

  useEffect(() => {
    const t = setTimeout(async () => {
      setHealth('pending');
      const r = await pingBackend(backend);
      setHealth(r.ok ? 'ok' : 'bad');
    }, 400);
    return () => clearTimeout(t);
  }, [backend]);

  const handleSave = async () => {
    await saveBackend(backend);
    await saveInterval(intervalSec);
    Alert.alert('Saved', 'Settings updated');
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

  if (!config) {
    return <View style={[styles.screen, styles.center]} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <BracketCard style={{ width: 40, height: 40, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.ink, fontSize: 18 }}>←</Text>
            </BracketCard>
          </TouchableOpacity>
          <Text style={styles.h2}>Settings</Text>
        </View>

        {/* Backend URL */}
        <Text style={[styles.label, { marginBottom: 8 }]}>BACKEND URL</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
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

        {/* Interval */}
        <Text style={[styles.label, { marginBottom: 12 }]}>UPDATE INTERVAL</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {INTERVAL_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setIntervalSec(opt.value)}
              style={{
                backgroundColor:  intervalSec === opt.value ? colors.white : colors.surface,
                borderColor:      intervalSec === opt.value ? colors.white : colors.hairline2,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                minWidth: 64,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color:          intervalSec === opt.value ? colors.black : colors.ink2,
                fontSize: 12,
                fontWeight: '700',
                fontFamily: 'monospace',
                letterSpacing: 1.2,
              }}>
                {opt.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Interval warning — Android clamps background tracking to 60s minimum */}
        {intervalSec < 60 && (
          <View style={{
            backgroundColor: colors.surface2,
            borderColor: colors.hairline2,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 16,
          }}>
            <Text style={{
              color: colors.ink,
              fontSize: 12,
              fontFamily: 'monospace',
              lineHeight: 18,
            }}>
              ⚠ {intervalSec}s is below Android's 60s minimum for background tracking. Background tracking will fire every 60s. Foreground "Send Now" is unaffected.
            </Text>
          </View>
        )}

        {/* Save */}
        <TouchableOpacity style={[styles.button, { marginBottom: 12 }]} onPress={handleSave}>
          <Text style={styles.buttonText}>SAVE SETTINGS</Text>
        </TouchableOpacity>

        {/* Device info */}
        <BracketCard style={{ marginBottom: 12, marginTop: 12 }}>
          <Text style={[styles.label, { marginBottom: 12 }]}>DEVICE</Text>
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
