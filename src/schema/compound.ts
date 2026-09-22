import { z } from 'zod';
import {
  Category,
  Goal,
  ISODate,
  Jurisdiction,
  LegalStatus,
  NON_QUALIFYING_EVIDENCE,
  PublishStatus,
  ResearchStatus,
  RiskCategory,
  RouteOfAdministration,
  Slug,
  SportBody,
  SportStatus,
} from './primitives';
import { Cited, Dual, Source, SourceRef } from './provenance';

/** Minimum qualifying citations before a compound may be published. */
export const MINIMUM_SOURCES = 4;

/* ------------------------------------------------------------------ *
 * DISPLAY -- what the user sees on the page
 * ------------------------------------------------------------------ */

export const Alias = z.object({
  name: z.string().min(1),
  /**
   * Misspellings are stored as aliases so search finds the compound no matter
   * what the user types, but they are never rendered as legitimate names.
   */
  kind: z.enum(['brand', 'chemical', 'abbreviation', 'street', 'misspelling']),
});
export type Alias = z.infer<typeof Alias>;

export const Definitions = z.object({
  /**
   * Plain-language, written for someone who has never heard of this.
   * Describes; does not instruct. No dosing directives, no medical advice.
   */
  simple: z.string().min(40).max(1200),
  /** Technical. Mechanism, receptor targets, pharmacokinetics. Substantially deeper. */
  scientific: z.string().min(80).max(4000),
});
export type Definitions = z.infer<typeof Definitions>;

export const DoseRange = z.object({
  route: RouteOfAdministration,
  low: z.number().positive(),
  high: z.number().positive(),
  unit: z.enum(['mg', 'g', 'mcg', 'IU', 'ml']),
  frequency: z.enum(['once', 'daily', 'twice-daily', 'three-times-daily', 'weekly', 'as-needed']),
  /** Free-text nuance: timing, food, cycling, titration. */
  note: z.string().max(600).optional(),
  sources: z.array(SourceRef).min(1, 'a dose range must be sourced'),
}).refine((d) => d.high >= d.low, { message: 'high dose must be >= low dose', path: ['high'] });
export type DoseRange = z.infer<typeof DoseRange>;

export const SideEffect = z.object({
  effect: z.string().min(3).max(200),
  frequency: z.enum(['common', 'uncommon', 'rare', 'unknown']),
  severity: z.enum(['mild', 'moderate', 'severe']),
  /** What reduces or offsets it, if anything. Feeds the downside-protection engine. */
  mitigation: z.string().max(400).optional(),
  sources: z.array(SourceRef).min(1, 'a side effect must be sourced'),
});
export type SideEffect = z.infer<typeof SideEffect>;

/** Quality guidance. Explicitly no affiliate links, no brand recommendations. */
export const BuyingGuidance = z.object({
  /** e.g. "sublingual", "magnesium L-threonate", "standardized to 20% bacosides" */
  form: z.string().min(2).max(200),
  whyItMatters: z.string().min(20).max(800),
  sources: z.array(SourceRef).min(1),
});
export type BuyingGuidance = z.infer<typeof BuyingGuidance>;

/* ------------------------------------------------------------------ *
 * MACHINE -- structured objects the engines compute on
 * ------------------------------------------------------------------ */

/**
 * A single benefit assertion. This is the unit your "no uncited claim can
 * display" rule operates on. One claim, one effect, its own citations.
 */
export const Claim = z.object({
  id: z.string().min(1),
  /** Which goal this claim serves. Lets the protocol engine match compound to user. */
  goal: Goal,
  /** The assertion, in one sentence, as shown to the user. */
  statement: z.string().min(10).max(400),
  /** How strong the evidence is *for this specific claim*, not the compound overall. */
  strength: ResearchStatus,
  /** Effect size where a source reports one. Optional because many do not. */
  effectSize: z.string().max(200).optional(),
  /** Non-empty by construction: a claim without a source cannot exist. */
  sources: z.array(SourceRef).min(1, 'every claim requires at least one source'),
  /**
   * True when the claim is supported only by user reports. Such claims are
   * rendered in a visually distinct, clearly-labelled block and are excluded
   * from protocol generation.
   */
  anecdotal: z.boolean().default(false),
});
export type Claim = z.infer<typeof Claim>;

export const HalfLife = z.object({
  lowHours: z.number().positive(),
  highHours: z.number().positive(),
  note: z.string().max(400).optional(),
  sources: z.array(SourceRef).min(1),
});
export type HalfLife = z.infer<typeof HalfLife>;

export const Kinetics = z.object({
  onsetMinutesLow: z.number().nonnegative(),
  onsetMinutesHigh: z.number().nonnegative(),
  durationHoursLow: z.number().nonnegative(),
  durationHoursHigh: z.number().nonnegative(),
  sources: z.array(SourceRef).min(1),
});
export type Kinetics = z.infer<typeof Kinetics>;

export const LegalEntry = z.object({
  jurisdiction: Jurisdiction,
  status: LegalStatus,
  /** Plain statement of what that means for the reader in that country. */
  display: z.string().min(10).max(600),
  /** Legal status changes. This drives the freshness warning on the page. */
  asOf: ISODate,
  sources: z.array(SourceRef).min(1, 'legal status must cite a regulatory source'),
});
export type LegalEntry = z.infer<typeof LegalEntry>;

export const SportEntry = z.object({
  body: SportBody,
  status: SportStatus,
  asOf: ISODate,
  sources: z.array(SourceRef).min(1),
});
export type SportEntry = z.infer<typeof SportEntry>;

/* ------------------------------------------------------------------ *
 * The compound document
 * ------------------------------------------------------------------ */

export const Compound = z.object({
  /* --- identity --- */
  /** Permanent. This is the public URL. Changing it breaks links and rankings. */
  slug: Slug,
  name: z.string().min(2).max(120),
  aliases: z.array(Alias).default([]),
  categories: z.array(Category).min(1, 'at least one category'),
  /** Sibling compounds, by slug. Powers "same family" browsing. */
  family: z.array(Slug).default([]),

  /* --- display --- */
  definitions: Definitions,
  drugClass: Dual(z.string().min(2).max(120)),
  routes: z.array(Dual(RouteOfAdministration)).min(1),
  dosing: z.array(DoseRange).default([]),
  sideEffects: z.array(SideEffect).default([]),
  buying: z.array(BuyingGuidance).default([]),
  /** Anything that did not fit a structured field. Prose only, never parsed. */
  notes: z.string().max(4000).optional(),

  /* --- machine --- */
  claims: z.array(Claim).default([]),
  goals: z.array(Goal).default([]),
  halfLife: HalfLife.optional(),
  kinetics: Kinetics.optional(),
  researchStatus: ResearchStatus,

  /* --- safety --- */
  risk: z.object({
    category: RiskCategory,
    /** Mandatory. A risk band with no reason is not usable information. */
    why: z.string().min(20).max(1200),
    sources: z.array(SourceRef).min(1),
  }),
  /** Hard blocks. Surfaced as warnings and enforced by the stack builder. */
  doNotPairWith: z.array(Slug).default([]),
  /** Compounds that offset this one's downsides. Feeds protocol construction. */
  downsideProtection: z.array(
    Cited(z.object({ compound: Slug, offsets: z.string().min(3).max(200) })),
  ).default([]),
  /** Typical stacks this appears in. Powers stack suggestions. */
  commonPairs: z.array(Slug).default([]),

  legal: z.array(LegalEntry).default([]),
  sport: z.array(SportEntry).default([]),

  /* --- provenance --- */
  sources: z.array(Source).default([]),

  /* --- publishing metadata (schema only; never rendered) --- */
  meta: z.object({
    status: PublishStatus,
    createdAt: ISODate,
    lastUpdatedAt: ISODate,
    /** Set only by a human who re-read the sources. Drives the freshness loop. */
    lastReviewedAt: ISODate.optional(),
    reviewedBy: z.string().min(2).optional(),
    /** Set true when a human wrote the reasoning, not a generator. */
    handAuthored: z.boolean().default(true),
  }),
});

export type Compound = z.infer<typeof Compound>;

/* ------------------------------------------------------------------ *
 * THE PUBLISHING GATE
 * ------------------------------------------------------------------ *
 * Draft and in-review compounds may be incomplete -- that is the point of a
 * draft. These rules apply only at the moment something claims to be
 * `published`, which is the moment it becomes reachable by a user.
 */

export const PublishableCompound = Compound.superRefine((c, ctx) => {
  if (c.meta.status !== 'published') return;

  const fail = (message: string, path: (string | number)[]) =>
    ctx.addIssue({ code: 'custom', message, path });

  // Rule: four qualifying sources minimum. Anecdote and case reports do not count.
  const qualifying = c.sources.filter((s) => !NON_QUALIFYING_EVIDENCE.includes(s.evidence));
  if (qualifying.length < MINIMUM_SOURCES) {
    fail(
      `published compounds need >= ${MINIMUM_SOURCES} qualifying sources; found ${qualifying.length} ` +
        `(${c.sources.length} total, ${c.sources.length - qualifying.length} non-qualifying)`,
      ['sources'],
    );
  }

  // Rule: every SourceRef anywhere in the document must resolve to a real source.
  const known = new Set(c.sources.map((s) => s.id));
  const checkRefs = (refs: string[], path: (string | number)[]) => {
    refs.forEach((r, i) => {
      if (!known.has(r)) fail(`unknown source id "${r}"`, [...path, i]);
    });
  };
  c.claims.forEach((cl, i) => checkRefs(cl.sources, ['claims', i, 'sources']));
  c.dosing.forEach((d, i) => checkRefs(d.sources, ['dosing', i, 'sources']));
  c.sideEffects.forEach((s, i) => checkRefs(s.sources, ['sideEffects', i, 'sources']));
  c.legal.forEach((l, i) => checkRefs(l.sources, ['legal', i, 'sources']));
  c.sport.forEach((s, i) => checkRefs(s.sources, ['sport', i, 'sources']));
  c.buying.forEach((b, i) => checkRefs(b.sources, ['buying', i, 'sources']));
  checkRefs(c.risk.sources, ['risk', 'sources']);
  if (c.halfLife) checkRefs(c.halfLife.sources, ['halfLife', 'sources']);
  if (c.kinetics) checkRefs(c.kinetics.sources, ['kinetics', 'sources']);

  // Rule: a human signed off, and said when.
  if (!c.meta.lastReviewedAt) fail('published compounds require lastReviewedAt', ['meta', 'lastReviewedAt']);
  if (!c.meta.reviewedBy) fail('published compounds require reviewedBy', ['meta', 'reviewedBy']);

  // Rule: both reading levels present. Beginners and nerds are both served.
  if (!c.definitions.simple) fail('simple definition required', ['definitions', 'simple']);
  if (!c.definitions.scientific) fail('scientific definition required', ['definitions', 'scientific']);

  // Rule: legal status for every market shipped.
  const covered = new Set(c.legal.map((l) => l.jurisdiction));
  for (const j of ['US', 'UK', 'EU', 'AU'] as const) {
    if (!covered.has(j)) fail(`missing legal status for ${j}`, ['legal']);
  }

  // Rule: a compound must actually claim something, and claims drive goals.
  if (c.claims.length === 0) fail('published compounds need at least one claim', ['claims']);
  for (const cl of c.claims) {
    if (!c.goals.includes(cl.goal)) {
      fail(`claim "${cl.id}" serves goal "${cl.goal}" which is missing from goals[]`, ['goals']);
    }
  }
});

/** True only for compounds safe to show a user. The one check the data layer must never skip. */
export function isPublic(c: Compound): boolean {
  return c.meta.status === 'published';
}
