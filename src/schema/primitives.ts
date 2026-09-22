import { z } from 'zod';

/**
 * Controlled vocabularies.
 *
 * Every one of these exists because some engine needs to filter, match, or
 * compute on it. If a value is only ever read by a human, it belongs in prose,
 * not here. If an engine touches it, it must be one of these fixed values --
 * never a free-text string an engine has to interpret.
 */

/** Permanent, URL-safe identifier. Appears in the public URL, so it never changes. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
  .min(2)
  .max(64);
export type Slug = z.infer<typeof Slug>;

export const ISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
export type ISODate = z.infer<typeof ISODate>;

/**
 * Publishing gate. Lives in the schema only -- it is never rendered, and the
 * public data layer filters on it. Nothing but `published` may reach a user.
 */
export const PublishStatus = z.enum(['draft', 'in_review', 'published', 'retired']);
export type PublishStatus = z.infer<typeof PublishStatus>;

/** What the compound is *for*. Drives protocol matching and onboarding. */
export const Goal = z.enum([
  'focus',
  'memory',
  'learning',
  'mood',
  'motivation',
  'anxiety-reduction',
  'stress-resilience',
  'sleep',
  'energy',
  'physical-endurance',
  'neuroprotection',
  'long-term-brain-health',
  'creativity',
  'verbal-fluency',
  'social-ease',
]);
export type Goal = z.infer<typeof Goal>;

export const Category = z.enum([
  'racetam',
  'cholinergic',
  'adaptogen',
  'stimulant',
  'amino-acid',
  'vitamin',
  'mineral',
  'herbal',
  'peptide',
  'ampakine',
  'dopaminergic',
  'serotonergic',
  'gabaergic',
  'nootropic-mushroom',
  'anxiolytic',
  'sleep-aid',
  'metabolic',
  'nutraceutical',
  'prescription',
  'research-chemical',
]);
export type Category = z.infer<typeof Category>;

export const RouteOfAdministration = z.enum([
  'oral',
  'sublingual',
  'buccal',
  'intranasal',
  'transdermal',
  'inhaled',
  'subcutaneous',
  'intramuscular',
  'rectal',
]);
export type RouteOfAdministration = z.infer<typeof RouteOfAdministration>;

/**
 * Risk band. `why` is mandatory wherever this is used -- a risk label with no
 * stated reason is not information, it is a vibe.
 */
export const RiskCategory = z.enum(['low', 'moderate', 'high', 'unknown']);
export type RiskCategory = z.infer<typeof RiskCategory>;

/** Jurisdictions tracked. Matches the four markets in scope. */
export const Jurisdiction = z.enum(['US', 'UK', 'EU', 'AU']);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const LegalStatus = z.enum([
  'otc',
  'dietary-supplement',
  'prescription-only',
  'unscheduled',
  'controlled',
  'banned',
  'unapproved-research-chemical',
  'unclear',
]);
export type LegalStatus = z.infer<typeof LegalStatus>;

/** Sport eligibility. Surfaced prominently -- a banned-substance mistake is career-ending. */
export const SportBody = z.enum(['WADA', 'NCAA', 'NFL', 'NBA', 'MLB', 'UFC', 'FIFA']);
export type SportBody = z.infer<typeof SportBody>;

export const SportStatus = z.enum(['permitted', 'banned', 'banned-in-competition', 'monitored', 'unclear']);
export type SportStatus = z.infer<typeof SportStatus>;

/**
 * Evidence strength of a single source, roughly descending.
 * `anecdotal` exists so community-sourced material can be stored and clearly
 * labelled -- never so it can be counted toward the citation minimum.
 */
export const EvidenceType = z.enum([
  'meta-analysis',
  'systematic-review',
  'randomized-controlled-trial',
  'human-trial-uncontrolled',
  'observational',
  'narrative-review',
  'animal',
  'in-vitro',
  'case-report',
  'regulatory-document',
  'anecdotal',
]);
export type EvidenceType = z.infer<typeof EvidenceType>;

/** Source types that do NOT count toward the four-citation publishing minimum. */
export const NON_QUALIFYING_EVIDENCE: readonly EvidenceType[] = ['anecdotal', 'case-report'];

/** How settled the science is. Powers the "most up-to-date research status" field. */
export const ResearchStatus = z.enum([
  'well-established',
  'emerging',
  'mixed-evidence',
  'preliminary',
  'largely-anecdotal',
  'disputed',
]);
export type ResearchStatus = z.infer<typeof ResearchStatus>;

/**
 * Where a piece of data came from. The scaling story: you hand-author the
 * pairs that matter, and pathway-overlap inference fills in the rest.
 * Inferred data is always marked, and is never presented as equivalent.
 */
export const Provenance = z.enum(['hand-authored', 'pathway-overlap', 'regulatory-import']);
export type Provenance = z.infer<typeof Provenance>;

/** Interaction risk between two compounds. */
export const InteractionRisk = z.enum([
  'synergistic',
  'neutral',
  'caution',
  'avoid',
  'contraindicated',
]);
export type InteractionRisk = z.infer<typeof InteractionRisk>;
