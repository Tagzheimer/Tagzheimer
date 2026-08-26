/**
 * Tagzheimer Tracker — monochrome dark mode theme
 * Matches the web frontend pixel-for-pixel.
 *
 * Pure grayscale palette, no hue anywhere.
 */
import { StyleSheet } from 'react-native';

export const colors = {
  canvas:    '#0a0a0a',
  surface:   '#0f0f0f',
  surface2:  '#161616',
  surface3:  '#1f1f1f',
  hairline:  '#262626',
  hairline2: '#333333',
  hairline3: '#404040',
  ink:       '#fafafa',
  ink2:      '#a3a3a3',
  ink3:      '#6b6b6b',
  ink4:      '#404040',
  white:     '#ffffff',
  black:     '#0a0a0a',
};

const styles = StyleSheet.create({
  // === Layout containers ===
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  safeTop: {
    paddingTop: 60,  // status bar + breathing
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // === Typography ===
  h1: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  h2: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    color: colors.ink2,
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    color: colors.ink,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  label: {
    color: colors.ink3,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: colors.ink3,
    fontSize: 13,
  },

  // === Cards ===
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    padding: 20,
    position: 'relative',
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    flex: 1,
  },

  // === Inputs ===
  input: {
    height: 50,
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderWidth: 1,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 15,
    fontFamily: 'monospace',
  },

  // === Buttons ===
  button: {
    height: 50,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  buttonSecondary: {
    height: 50,
    backgroundColor: colors.surface,
    borderColor: colors.hairline2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonSecondaryText: {
    color: colors.ink2,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },

  // === Status pill ===
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillOnline: {
    backgroundColor: colors.white,
  },
  pillOffline: {
    backgroundColor: colors.surface3,
  },
  pillTextOnline: {
    color: colors.black,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  pillTextOffline: {
    color: colors.ink3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // === Divider ===
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
  marginVertical: 16,
  width: '100%',
  },

  // === Spacers ===
  gap4:  { height: 4 },
  gap8:  { height: 8 },
  gap12: { height: 12 },
  gap16: { height: 16 },
  gap24: { height: 24 },
  gap32: { height: 32 },
});

export default styles;
