import { Tabs } from 'expo-router';
import { colors } from '@/theme';

/**
 * Four tabs, matching the four things the product does: a personalised home,
 * the full catalog, the assistant, and the membership surface.
 *
 * Icons are deliberately omitted -- text labels are unambiguous while the
 * foundation is built, and the developer taking this over will bring their own
 * icon set rather than inherit a placeholder one.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catalog' }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask' }} />
      <Tabs.Screen name="core" options={{ title: 'Core' }} />
    </Tabs>
  );
}
