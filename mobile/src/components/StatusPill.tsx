import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';

export function StatusPill({ online, label }: { online: boolean; label?: string }) {
  return (
    <View style={[styles.pill, online ? styles.online : styles.offline]}>
      <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
      <Text style={online ? styles.textOn : styles.textOff}>
        {label || (online ? 'ONLINE' : 'OFFLINE')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  online:  { backgroundColor: colors.white },
  offline: { backgroundColor: colors.surface3 },
  dot:     { width: 6, height: 6, borderRadius: 3 },
  dotOn:   { backgroundColor: colors.black },
  dotOff:  { backgroundColor: colors.ink3 },
  textOn:  { color: colors.black, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, fontFamily: 'monospace' },
  textOff: { color: colors.ink3, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, fontFamily: 'monospace' },
});
