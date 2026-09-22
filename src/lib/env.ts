/**
 * Environment access, in one place.
 *
 * Only EXPO_PUBLIC_* values belong here -- they are compiled into the client
 * bundle and are readable by anyone who installs the app or views the site.
 * A secret must never be referenced from this file. The content sync script
 * reads the service-role key separately, and only ever runs on your machine
 * or in CI.
 */

function read(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  siteUrl: read('EXPO_PUBLIC_SITE_URL', 'https://helyx.us'),
  iosAppId: read('EXPO_PUBLIC_IOS_APP_ID'),
};

/**
 * The app is designed to run without Supabase configured -- the catalog reads
 * from bundled content files, so browsing works with no backend at all.
 * Only auth and user data need this.
 */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
