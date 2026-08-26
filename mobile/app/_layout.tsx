import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import styles from '../src/styles/theme';
import { colors } from '../src/styles/theme';
import {
  initNotifications,
  setupNotificationCategories,
  subscribeToNotifications,
} from '../src/services/notifications';
import { bootstrapTracking, pauseTracking, resumeTracking, stopTracking } from '../src/services/backgroundTask';
import { loadTrackingStatus } from '../src/services/storage';
import { router } from 'expo-router';

export default function RootLayout() {
  // Use a ref so the cleanup function can access the unsubscribe even
  // though the async IIFE resolves later.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      // 1. Initialize notifications
      await initNotifications();
      await setupNotificationCategories();

      // 2. Subscribe to notification action taps (Pause / Resume / Stop / Open)
      const unsubscribe = subscribeToNotifications(async (action, _data) => {
        switch (action) {
          case 'PAUSE':
            await pauseTracking();
            break;
          case 'RESUME':
            await resumeTracking();
            break;
          case 'STOP':
            await stopTracking();
            break;
          case 'OPEN':
          default: {
            // Open the app — navigate to tracker screen if paired
            const status = await loadTrackingStatus();
            if (status.state !== 'stopped') {
              router.replace('/paired');
            } else {
              router.replace('/');
            }
            break;
          }
        }
      });

      // Only store the unsubscribe if we're still mounted (avoid setting state on unmounted)
      if (isMounted) {
        unsubscribeRef.current = unsubscribe;
      } else {
        // Component unmounted while we were initializing — clean up now
        unsubscribe();
      }

      // 3. Bootstrap background tracking (re-registers if was active before reboot)
      if (isMounted) {
        await bootstrapTracking();
      }
    })();

    return () => {
      isMounted = false;
      // Call the unsubscribe if it was captured before unmount
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="paired" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

// Loading view (not currently used — kept for future splash logic)
export function LoadingView() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.white} size="small" />
    </View>
  );
}
