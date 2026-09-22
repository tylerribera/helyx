import { z } from 'zod';
import { ISODate, InteractionRisk, Provenance, PublishStatus, Slug } from './primitives';
import { Source, SourceRef } from './provenance';

/**
 * Compound-to-compound interactions.
 *
 * Stored relationally rather than nested inside compounds, because an
 * interaction belongs to a *pair*, not to either member. Nesting it would mean
 * writing it twice and letting the two copies drift.
 */

/**
 * Pairs are stored once, canonically ordered (a < b alphabetically), so that
 * lookup never depends on argument order and a pair can never be entered twice
 * under two orderings.
 */
export const Interaction = z
  .object({
    a: Slug,
    b: Slug,
    risk: InteractionRisk,
    /** What actually happens when these are combined, in plain language. */
    note: z.string().min(20).max(1200),
    /**
     * Required for every risk level except pathway-overlap inferences, which
     * are by definition not directly studied. See the refinement below.
     */
    sources: z.array(SourceRef).default([]),
    /**
     * `hand-authored` -- you wrote this because the pair matters.
     * `pathway-overlap` -- inferred from shared mechanism, lower confidence,
     *   always labelled as inferred in the UI, never used to assert safety.
     */
    provenance: Provenance,
    /** Shared mechanisms that triggered an inference. Only meaningful for pathway-overlap. */
    sharedPathways: z.array(z.string().min(2)).default([]),
    /** Full source records when this interaction is loaded standalone. */
    sourceRecords: z.array(Source).default([]),
    meta: z.object({
      status: PublishStatus,
      lastUpdatedAt: ISODate,
      lastReviewedAt: ISODate.optional(),
      reviewedBy: z.string().min(2).optional(),
    }),
  })
  .superRefine((i, ctx) => {
    const fail = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });

    if (i.a === i.b) fail('an interaction needs two distinct compounds', ['b']);
    if (i.a > i.b) fail(`pair must be canonically ordered: expected a="${i.b}", b="${i.a}"`, ['a']);

    if (i.provenance === 'pathway-overlap' && i.sharedPathways.length === 0) {
      fail('a pathway-overlap inference must name the shared pathways', ['sharedPathways']);
    }

    if (i.meta.status !== 'published') return;

    // Hand-authored interactions must be sourced. Inferred ones are exempt --
    // but are marked inferred in the UI precisely because they are not.
    if (i.provenance === 'hand-authored' && i.sources.length === 0) {
      fail('a published hand-authored interaction requires at least one source', ['sources']);
    }

    // The dangerous end of the scale must always be directly sourced, never inferred.
    if ((i.risk === 'contraindicated' || i.risk === 'avoid') && i.provenance === 'pathway-overlap') {
      fail(
        `"${i.risk}" may not rest on pathway inference alone -- hand-author it with a source`,
        ['provenance'],
      );
    }
    if ((i.risk === 'contraindicated' || i.risk === 'avoid') && i.sources.length === 0) {
      fail(`"${i.risk}" requires a source`, ['sources']);
    }

    if (!i.meta.lastReviewedAt) fail('published interactions require lastReviewedAt', ['meta']);
  });

export type Interaction = z.infer<typeof Interaction>;

/** Canonical ordering, so callers never have to think about argument order. */
export function pairKey(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

/** Risk levels that must block or warn in the stack builder rather than merely inform. */
export const BLOCKING_RISKS: readonly InteractionRisk[] = ['avoid', 'contraindicated'];

export function isBlocking(risk: InteractionRisk): boolean {
  return BLOCKING_RISKS.includes(risk);
}
