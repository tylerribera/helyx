import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, space, type } from '@/theme';

/**
 * Shared primitives. Intentionally plain -- these carry layout and spacing so
 * screens stay readable, and nothing more. Restyling happens here.
 */

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent}>
      {children}
    </ScrollView>
  );
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={s.title}>{children}</Text>;
}

export function Heading({ children }: PropsWithChildren) {
  return <Text style={s.heading}>{children}</Text>;
}

export function Body({ children, muted }: PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[s.body, muted && s.muted]}>{children}</Text>;
}

export function Small({ children, muted }: PropsWithChildren<{ muted?: boolean }>) {
  return <Text style={[s.small, muted && s.muted]}>{children}</Text>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={s.section}>
      <Heading>{title}</Heading>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[s.badge, color ? { borderColor: color } : null]}>
      <Text style={[s.badgeText, color ? { color } : null]}>{label}</Text>
    </View>
  );
}

export function Row({ children }: PropsWithChildren) {
  return <View style={s.row}>{children}</View>;
}

/**
 * Marks content that has not passed human review. Rendered anywhere a
 * non-published compound is visible, so unreviewed material can never be
 * mistaken for reviewed material during development.
 */
export function DraftBanner({ status }: { status: string }) {
  return (
    <View style={s.draft}>
      <Text style={s.draftText}>
        {status.toUpperCase().replace('_', ' ')} — not reviewed. Visible in development only.
      </Text>
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.muted}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg, maxWidth: 780, width: '100%', alignSelf: 'center' },
  title: { ...type.title, color: colors.text },
  heading: { ...type.heading, color: colors.text },
  body: { ...type.body, color: colors.text, lineHeight: 22 },
  small: { ...type.small, color: colors.text, lineHeight: 19 },
  muted: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  section: { gap: space.sm },
  sectionBody: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  badge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  badgeText: { ...type.tiny, color: colors.textMuted },
  draft: {
    backgroundColor: colors.surfaceAlt,
    borderLeftWidth: 3,
    borderLeftColor: colors.draft,
    borderRadius: radius.sm,
    padding: space.md,
  },
  draftText: { ...type.tiny, color: colors.draft },
  empty: { padding: space.xl, alignItems: 'center' },
});
