/**
 * Content registry.
 *
 * Files here are the source of truth for the catalog. You author into these;
 * the database is a queryable copy, never the place edits originate.
 *
 * When the catalog grows past a few dozen entries this hand-maintained list
 * should be replaced with a generated manifest -- but an explicit list is
 * easier for a new developer to follow, so it stays until it hurts.
 */
import type { Compound, Interaction } from '@/schema';

import caffeine from './compounds/caffeine';
import lTheanine from './compounds/l-theanine';
import caffeineTheanine from './interactions/caffeine--l-theanine';

export const compounds: Compound[] = [caffeine, lTheanine];
export const interactions: Interaction[] = [caffeineTheanine];

/** Every compound, including drafts. Build tooling and the validator use this. */
export function allCompounds(): Compound[] {
  return compounds;
}

/**
 * Only what a user may see. Every read path that reaches a UI must go through
 * this, never through `compounds` directly.
 */
export function publishedCompounds(): Compound[] {
  return compounds.filter((c) => c.meta.status === 'published');
}

export function findCompound(slug: string): Compound | undefined {
  return compounds.find((c) => c.slug === slug);
}
