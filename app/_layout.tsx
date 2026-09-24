import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/state/profile';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* The landing page carries its own header, and on native it only
              redirects, so a stack header would flash before the handoff. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ title: 'Set up Helyx', presentation: 'modal' }} />
          <Stack.Screen name="compound/[slug]" options={{ title: '' }} />
        </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
