import { allCompounds, interactions as allInteractions } from '../../content';
import type { Category, Compound, Goal, Interaction } from '@/schema';
import { pairKey } from '@/schema';

/**
 * Read access to the compound catalog.
 *
 * Reads from bundled content files rather than from the database, for three
 * reasons: browsing works with no network, the web build can pre-render every
 * compound page at build time for SEO, and a new developer can clone the repo
 * and see real screens without provisioning anything.
 *
 * EVERY read path a UI touches must come through this module, because this is
 * where the publish gate is applied. Never import from /content directly in a
 * component.
 */

/**
 * Drafts are visible in development so layouts can be built against real
 * shapes. In a production build this is false and drafts are unreachable,
 * which is what makes "unreviewed content cannot leak" true rather than
 * merely intended. Anything surfaced this way must be badged -- see isDraft().
 */
export const SHOW_DRAFTS = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFTS === 'true';

function visible(c: Compound): boolean {
  return c.meta.status === 'published' || (SHOW_DRAFTS && c.meta.status !== 'retired');
}

export function isDraft(c: Compound): boolean {
  return c.meta.status !== 'published';
}

export function listCompounds(): Compound[] {
  return allCompounds()
    .filter(visible)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCompound(slug: string): Compound | undefined {
  return allCompounds().find((c) => c.slug === slug && visible(c));
}

/** Slugs to pre-render at build time. Drafts are excluded from the static site. */
export function publishedSlugs(): string[] {
  return allCompounds()
    .filter((c) => c.meta.status === 'published')
    .map((c) => c.slug);
}

/**
 * Search across names, aliases, and misspellings, so a user finds the compound
 * no matter what they type.
 */
export function searchCompounds(query: string): Compound[] {
  const q = query.trim().toLowerCase();
  if (!q) return listCompounds();
  return listCompounds().filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.slug.includes(q)) return true;
    return c.aliases.some((a) => a.name.toLowerCase().includes(q));
  });
}

export function filterByGoal(goal: Goal): Compound[] {
  return listCompounds().filter((c) => c.goals.includes(goal));
}

export function filterByCategory(category: Category): Compound[] {
  return listCompounds().filter((c) => c.categories.includes(category));
}

/** Every interaction involving this compound, normalised so `other` is the partner. */
export function interactionsFor(slug: string): { other: string; interaction: Interaction }[] {
  return allInteractions
    .filter((i) => i.a === slug || i.b === slug)
    .map((i) => ({ other: i.a === slug ? i.b : i.a, interaction: i }));
}

export function interactionBetween(x: string, y: string): Interaction | undefined {
  const [a, b] = pairKey(x, y);
  return allInteractions.find((i) => i.a === a && i.b === b);
}

/**
 * Deterministic daily pick. Rotates through the catalog by date so every user
 * sees the same compound on a given day and it changes at midnight -- no state
 * to store, and the pick is reproducible for debugging.
 */
export function dailyCompound(date = new Date()): Compound | undefined {
  const pool = listCompounds();
  if (pool.length === 0) return undefined;
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return pool[dayNumber % pool.length];
}
