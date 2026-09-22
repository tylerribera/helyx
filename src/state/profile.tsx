import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { OnboardingProfile, type Tier } from '@/schema';

/**
 * Local profile state.
 *
 * Stored on-device so onboarding works before an account exists -- a user can
 * complete onboarding and get value immediately, and the profile syncs up to
 * `profiles.onboarding` once they sign in.
 *
 * Kept deliberately small. When the developer adds real auth, this is the seam:
 * replace the AsyncStorage reads/writes with Supabase reads/writes and every
 * consumer keeps working.
 */

const STORAGE_KEY = 'helyx.profile.v1';

type ProfileState = {
  profile: OnboardingProfile | null;
  tier: Tier;
  ready: boolean;
  save: (p: OnboardingProfile) => Promise<void>;
  reset: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        // Parse through the schema rather than casting: a stored profile from an
        // older app version that no longer fits is discarded, not trusted.
        const parsed = OnboardingProfile.safeParse(JSON.parse(raw));
        if (parsed.success) setProfile(parsed.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (p: OnboardingProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, []);

  const reset = useCallback(async () => {
    setProfile(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Tier is hard-coded to free until billing exists. Deliberately a single
  // value so the paywall has one place to read from.
  const value = useMemo<ProfileState>(
    () => ({ profile, tier: 'free' as Tier, ready, save, reset }),
    [profile, ready, save, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
