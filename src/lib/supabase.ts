import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { env, isSupabaseConfigured } from './env';

/**
 * Supabase client, used for auth and user-owned data only.
 *
 * The compound catalog does NOT come from here -- it is bundled from /content
 * so that browsing works offline and so the web build can pre-render every
 * compound page at build time for SEO. See src/data/catalog.ts.
 *
 * Returns null when Supabase is unconfigured, so a fresh clone runs with no
 * environment setup. Callers must handle null rather than assume a client.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        // On web, sessions live in browser storage, which the SDK handles.
        // On native there is no localStorage, so AsyncStorage backs it.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Native has no URL bar to parse a magic-link callback out of.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

/** Throwing accessor for paths that genuinely cannot proceed without a backend. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
