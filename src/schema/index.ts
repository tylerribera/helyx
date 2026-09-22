/**
 * The Helyx content schema.
 *
 * This module is intentionally free of any React, React Native, or Supabase
 * import. It is pure data definition, so it can be lifted into a shared package,
 * run inside a CI validator, or backed by a CMS later without touching the app.
 *
 * Read `docs/SCHEMA.md` before authoring a compound.
 */

export * from './primitives';
export * from './provenance';
export * from './compound';
export * from './interaction';
export * from './user';
