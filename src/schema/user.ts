import { z } from 'zod';
import { Goal, ISODate, Slug } from './primitives';

/**
 * User-side data. Kept apart from content data because it has a completely
 * different security posture: content is world-readable, this is readable only
 * by its owner (enforced by row-level security, see supabase/migrations).
 */

export const ExperienceLevel = z.enum(['new', 'some', 'experienced', 'advanced']);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

export const Tier = z.enum(['free', 'core']);
export type Tier = z.infer<typeof Tier>;

/**
 * Free-tier onboarding. Deliberately short -- it exists to personalise the home
 * page immediately, not to qualify a buyer. The longer, more specific Core
 * onboarding is a separate pass (`CoreProfile`).
 */
export const OnboardingProfile = z.object({
  experience: ExperienceLevel,
  /** Ranked, most important first. Drives home-page suggestions. */
  goals: z.array(Goal).min(1).max(3),
  /**
   * Gates every suggestion. A user who says no to gray-market compounds must
   * never be shown one, regardless of how well it matches their goals.
   */
  willingToConsiderGrayMarket: z.boolean().default(false),
  /** Suppresses anything banned by a body they compete under. */
  competesInSport: z.boolean().default(false),
  sensitivities: z.array(z.enum(['caffeine', 'stimulants', 'sedatives'])).default([]),
  /** Used only to warn about interactions. Never diagnostic, never advice. */
  takesPrescriptionMedication: z.boolean().default(false),
  completedAt: ISODate.optional(),
});
export type OnboardingProfile = z.infer<typeof OnboardingProfile>;

/** Second, deeper onboarding. Core members only. Trains the assistant further. */
export const CoreProfile = z.object({
  sleepHoursTypical: z.number().min(0).max(24).optional(),
  chronotype: z.enum(['early', 'neutral', 'late']).optional(),
  caffeineMgPerDay: z.number().nonnegative().optional(),
  primaryBottleneck: z
    .enum(['cant-focus', 'cant-start', 'brain-fog', 'low-mood', 'poor-sleep', 'memory', 'stress'])
    .optional(),
  workPattern: z.enum(['deep-blocks', 'fragmented', 'shift-work', 'variable']).optional(),
  completedAt: ISODate.optional(),
});
export type CoreProfile = z.infer<typeof CoreProfile>;

/** A user's private note on a compound. Never leaves their account. */
export const CompoundNote = z.object({
  compound: Slug,
  body: z.string().max(8000),
  updatedAt: ISODate,
});
export type CompoundNote = z.infer<typeof CompoundNote>;
