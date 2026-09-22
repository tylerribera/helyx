import type { Compound, OnboardingProfile } from '@/schema';
import { listCompounds } from './catalog';

/**
 * Turns an onboarding profile into home-page suggestions.
 *
 * Deliberately simple and readable rather than clever: a developer taking this
 * over should be able to understand and re-tune it in one sitting. The scoring
 * weights are the part worth arguing about; the exclusion rules are not.
 */

export type Suggestion = {
  compound: Compound;
  score: number;
  /** Shown to the user. A suggestion the user cannot interrogate is a black box. */
  because: string[];
};

/**
 * Hard exclusions, applied before any scoring.
 *
 * These are filters, not penalties, and that distinction is the whole point: a
 * high enough score must never be able to surface a compound the user told us
 * to keep away from them.
 */
function excluded(c: Compound, p: OnboardingProfile): string | null {
  if (!p.willingToConsiderGrayMarket) {
    const gray = c.categories.includes('research-chemical') || c.categories.includes('peptide');
    if (gray) return 'gray-market';
    if (c.legal.some((l) => l.status === 'unapproved-research-chemical' || l.status === 'controlled')) {
      return 'gray-market';
    }
  }

  if (p.competesInSport) {
    const banned = c.sport.some((s) => s.status === 'banned' || s.status === 'banned-in-competition');
    if (banned) return 'banned-in-sport';
  }

  if (p.sensitivities.includes('stimulants') && c.categories.includes('stimulant')) {
    return 'stimulant-sensitivity';
  }
  if (p.sensitivities.includes('caffeine') && c.slug === 'caffeine') {
    return 'caffeine-sensitivity';
  }
  if (p.sensitivities.includes('sedatives') && c.categories.includes('sleep-aid')) {
    return 'sedative-sensitivity';
  }

  // Beginners are never shown high-risk compounds as an opening suggestion.
  // They remain browsable in the catalog; they are simply not recommended.
  if (p.experience === 'new' && c.risk.category === 'high') return 'too-advanced';

  return null;
}

const GOAL_WEIGHT = [5, 3, 2]; // first-ranked goal counts most

export function suggestFor(profile: OnboardingProfile, limit = 3): Suggestion[] {
  const scored: Suggestion[] = [];

  for (const compound of listCompounds()) {
    if (excluded(compound, profile)) continue;

    let score = 0;
    const because: string[] = [];

    profile.goals.forEach((goal, rank) => {
      if (compound.goals.includes(goal)) {
        score += GOAL_WEIGHT[rank] ?? 1;
        because.push(`matches your ${goal.replace(/-/g, ' ')} goal`);
      }
    });

    if (score === 0) continue;

    // Better-evidenced compounds rank higher. A user asking for help deserves
    // the well-studied option before the interesting one.
    if (compound.researchStatus === 'well-established') {
      score += 3;
      because.push('well-established research');
    } else if (compound.researchStatus === 'emerging') {
      score += 1;
    }

    // Safety is a ranking signal, not just a filter.
    if (compound.risk.category === 'low') {
      score += 2;
      because.push('low risk profile');
    } else if (compound.risk.category === 'high') {
      score -= 2;
    }

    // Newcomers get gentler, better-understood compounds first.
    if (profile.experience === 'new' && compound.risk.category === 'low') score += 2;

    scored.push({ compound, score, because });
  }

  return scored.sort((a, b) => b.score - a.score || a.compound.name.localeCompare(b.compound.name)).slice(0, limit);
}

/** Why a compound was withheld. Powers an honest "not shown because..." view. */
export function exclusionsFor(profile: OnboardingProfile): { compound: Compound; reason: string }[] {
  return listCompounds()
    .map((compound) => ({ compound, reason: excluded(compound, profile) }))
    .filter((r): r is { compound: Compound; reason: string } => r.reason !== null);
}
