import { z } from 'zod';
import { EvidenceType, ISODate, Provenance } from './primitives';

/**
 * THE SEPARATION RULE
 * ===================
 * Every fact is stored twice: once as prose a human reads, once as a value a
 * machine computes on. The interaction engine, Your Core, and every filter can
 * only act on the machine side. They must never parse the prose.
 *
 * This file provides the two wrappers that make that rule structural rather
 * than aspirational. If a field is wrapped in `Dual` or `Cited`, it is
 * physically impossible to store the human half without the machine half.
 */

/** A source the reader can check. Sources are defined once per compound and referenced by id. */
export const Source = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  /** DOI, PubMed URL, or publisher URL. Something a reader can actually open. */
  url: z.url(),
  /** Journal, agency, or publisher. */
  publisher: z.string().min(2),
  year: z.number().int().min(1900).max(2100),
  evidence: EvidenceType,
  /**
   * What this source actually demonstrates, in one line. Written by a human who
   * read it. This is the guard against citation-stuffing: if you cannot state
   * what the paper showed, you have not read it and it does not belong here.
   */
  takeaway: z.string().min(10).max(400),
  /** Sample size, where the source reports one. Surfaced so weak studies read as weak. */
  sampleSize: z.number().int().positive().optional(),
});
export type Source = z.infer<typeof Source>;

/** A reference to a `Source.id` defined on the same compound. */
export const SourceRef = z.string().min(1);
export type SourceRef = z.infer<typeof SourceRef>;

/**
 * A fact with both halves, where no citation is required.
 *
 * Use for descriptive properties that are definitional rather than empirical:
 * route of administration, drug class, category. `value` is what engines read.
 * `display` is what the user reads.
 */
export function Dual<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    /** Machine side. Filterable, comparable, computable. */
    value,
    /** Human side. The sentence rendered on the page. */
    display: z.string().min(1).max(600),
  });
}
export type Dual<T> = { value: T; display: string };

/**
 * A fact with both halves that additionally REQUIRES at least one source.
 *
 * Use for any empirical assertion -- anything claiming an effect, a mechanism,
 * a dose range, a risk. The non-empty tuple on `sources` is what makes an
 * uncited claim fail to parse rather than fail review.
 */
export function Cited<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    value,
    display: z.string().min(1).max(600),
    /** At least one. Enforced by the type, not by a reviewer's attention. */
    sources: z.array(SourceRef).min(1, 'every cited fact needs at least one source'),
    /** Hand-authored by default; inferred data must say so. */
    provenance: Provenance.default('hand-authored'),
    /** Set when this specific fact was last checked against its sources. */
    verifiedOn: ISODate.optional(),
  });
}
export type Cited<T> = {
  value: T;
  display: string;
  sources: SourceRef[];
  provenance: Provenance;
  verifiedOn?: ISODate;
};
