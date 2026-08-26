import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../styles/theme';

/**
 * Corner brackets — same aesthetic as the web frontend.
 * A small "viewfinder" frame around the four corners of a parent.
 */
export function CornerBrackets({ size = 8, color }: { size?: number; color?: string }) {
  const c = color || colors.hairline3;
  return (
    <>
      <View style={[styles.bracket, styles.tl, { width: size, height: size, borderColor: c }]} />
      <View style={[styles.bracket, styles.tr, { width: size, height: size, borderColor: c }]} />
      <View style={[styles.bracket, styles.bl, { width: size, height: size, borderColor: c }]} />
      <View style={[styles.bracket, styles.br, { width: size, height: size, borderColor: c }]} />
    </>
  );
}

/**
 * Card with corner brackets — used for stat tiles and primary content blocks.
 */
export function BracketCard({
  children,
  style,
  bracketColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  bracketColor?: string;
}) {
  return (
    <View style={[styles.card, style]}>
      <CornerBrackets color={bracketColor} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    padding: 20,
    position: 'relative',
  },
  bracket: {
    position: 'absolute',
    borderColor: colors.hairline3,
  },
  tl: { top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1 },
  tr: { top: -1, right: -1, borderTopWidth: 1, borderRightWidth: 1 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 1, borderLeftWidth: 1 },
  br: { bottom: -1, right: -1, borderBottomWidth: 1, borderRightWidth: 1 },
});
