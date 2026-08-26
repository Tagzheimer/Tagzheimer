import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import styles from '../src/styles/theme';
import { colors } from '../src/styles/theme';
import { BracketCard } from '../src/components/BracketCard';
import { loadConfig, savePairing, saveBackend } from '../src/services/storage';
import { pair, pingBackend } from '../src/services/api';

export default function PairingScreen() {
  const [serial, setSerial] = useState('');
  const [backend, setBackend] = useState('http://10.0.2.2:5000');
  const [status, setStatus] = useState<'idle' | 'pairing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [healthCheck, setHealthCheck] = useState<'pending' | 'ok' | 'bad' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cfg = await loadConfig();
      setSerial(cfg.serial || '');
      setBackend(cfg.backend);
      // Already paired? Jump straight to the tracker screen.
      if (cfg.accessToken && cfg.deviceId) {
        router.replace('/paired');
        return;
      }
      setLoading(false);
    })();
  }, []);

  const checkBackend = useCallback(async () => {
    setHealthCheck('pending');
    const result = await pingBackend(backend);
    setHealthCheck(result.ok ? 'ok' : 'bad');
  }, [backend]);

  useEffect(() => {
    const t = setTimeout(checkBackend, 400);
    return () => clearTimeout(t);
  }, [checkBackend]);

  const handlePair = async () => {
    if (!serial.trim() || serial.trim().length < 3) {
      setError('Serial must be at least 3 characters');
      return;
    }
    if (healthCheck !== 'ok') {
      Alert.alert('Backend unreachable', 'Make sure the Tagzheimer backend is running at the URL above.', [
        { text: 'Pair anyway', onPress: doPair },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    await doPair();
  };

  const doPair = async () => {
    setStatus('pairing');
    setError('');
    await saveBackend(backend);
    try {
      const r = await pair(backend, serial.trim());
      await savePairing(r.deviceId, r.accessToken, r.serialNumber);
      setStatus('success');
      setTimeout(() => router.replace('/paired'), 600);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Pairing failed');
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.white} size="small" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <BracketCard style={{ width: 64, height: 64, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, color: colors.ink, fontWeight: '700', fontFamily: 'monospace' }}>T</Text>
          </BracketCard>
          <Text style={styles.h2} accessible>
            Tagzheimer Tracker
          </Text>
          <Text style={[styles.label, { marginTop: 4 }]}>Android Companion</Text>
        </View>

        {/* Health check pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: healthCheck === 'ok' ? colors.white : healthCheck === 'bad' ? colors.ink4 : colors.hairline2,
          }} />
          <Text style={styles.label}>
            {healthCheck === 'pending' && 'CHECKING BACKEND'}
            {healthCheck === 'ok' && 'BACKEND REACHABLE'}
            {healthCheck === 'bad' && 'BACKEND UNREACHABLE'}
            {healthCheck === null && 'BACKEND STATUS'}
          </Text>
        </View>

        <Text style={[styles.label, { marginBottom: 8 }]}>Backend URL</Text>
        <TextInput
          style={[styles.input, { marginBottom: 16 }]}
          value={backend}
          onChangeText={setBackend}
          placeholder="http://10.0.2.2:5000"
          placeholderTextColor={colors.ink4}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.label, { marginBottom: 8 }]}>Device Serial Number</Text>
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          value={serial}
          onChangeText={setSerial}
          placeholder="e.g. TAG-001 or PHONE-001"
          placeholderTextColor={colors.ink4}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text style={[styles.muted, { marginBottom: 24 }]}>
          Enter the serial printed on the tracker. If it doesn't exist yet, the backend will auto-create one.
        </Text>

        {error && (
          <View style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline2,
            borderWidth: 1,
            padding: 12,
            marginBottom: 16,
          }}>
            <Text style={{ color: colors.ink, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePair}
          disabled={status === 'pairing'}
          style={[styles.button, status === 'pairing' && { opacity: 0.5 }]}
        >
          {status === 'pairing' ? (
            <>
              <ActivityIndicator color={colors.black} size="small" />
              <Text style={styles.buttonText}>PAIRING</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>PAIR DEVICE</Text>
          )}
        </TouchableOpacity>

        {/* Quick-pick hint card */}
        <BracketCard style={{ marginTop: 24 }}>
          <Text style={[styles.label, { marginBottom: 8 }]}>DEMO MODE</Text>
          <Text style={[styles.body, { color: colors.ink2, marginBottom: 12 }]}>
            Start the backend in demo mode to try without Firebase:
          </Text>
          <View style={{
            backgroundColor: colors.canvas,
            borderColor: colors.hairline,
            borderWidth: 1,
            padding: 12,
          }}>
            <Text style={[styles.mono, { fontSize: 12, color: colors.ink2 }]}>
              cd backend{'\n'}
              DEMO_MODE=true npm start
            </Text>
          </View>
          <Text style={[styles.muted, { marginTop: 12 }]}>
            Use any serial like TAG-001 (existing) or PHONE-001 (auto-provisioned).
          </Text>
        </BracketCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
