# The Helyx content schema

Read this before authoring a compound. The rules below are enforced by
`npm run validate:content`, so this document describes what the code already
checks rather than what someone promised to remember.

Source of truth: `src/schema/`.

## The three layers

The schema separates what a user reads from what an engine computes on, and
records where every fact came from.

### Display — what appears on the page

| Field | Notes |
|---|---|
| `slug` | The permanent public URL. **Never change it** — it breaks every inbound link and the page's search ranking. |
| `aliases` | Every alternate name *and* common misspellings, so search finds the compound no matter what the user types. Misspellings are stored but never rendered as legitimate names. |
| `categories` | One or more. Drives browse and filtering. |
| `family` | Sibling compounds, by slug. |
| `definitions.simple` | Plain language, for someone who has never heard of this. Describes, never instructs. |
| `definitions.scientific` | Mechanism, receptor targets, pharmacokinetics. Substantially deeper. |
| `legal` | Per jurisdiction, with an `asOf` date because legal status changes. |
| `sideEffects` | With frequency, severity, and what offsets them. |
| `buying` | Form and absorption guidance. **No affiliate links, no brand recommendations.** |
| `sources` | Rendered at the bottom of every page. |
| `dosing`, `notes` | Ranges reported in research, plus anything that did not fit a structured field. |

### Machine — what engines compute on

| Field | Why it exists |
|---|---|
| `claims[]` | Each benefit is its own object with its own citations. A claim with no source cannot be constructed. |
| `goals[]` | What the compound is for. The protocol engine matches these to onboarding answers. |
| `halfLife`, `kinetics` | Structured numbers, not prose, so timing can be computed. |
| `risk.category` + `risk.why` | The band is filterable; the reason is mandatory. A risk label with no stated reason is a vibe, not information. |
| `doNotPairWith[]` | Hard blocks. The stack builder enforces these. |
| `downsideProtection[]` | What offsets this compound's side effects. |
| `commonPairs[]` | Powers stack suggestions. |
| `sport[]` | Per governing body. A banned-substance mistake ends a career, so this is surfaced prominently. |
| `meta.status` | The publishing gate. Schema only — never rendered. |

### Provenance — the separation rule

> Every fact is stored twice: prose for the human, a value for the machine.
> An engine must never parse a sentence.

Two wrappers in `src/schema/provenance.ts` make this structural:

- **`Dual<T>`** — `{ value, display }`. For definitional properties (route of
  administration, drug class). No citation required.
- **`Cited<T>`** — `{ value, display, sources, provenance }`. For any empirical
  claim. `sources` is required and non-empty, so **an uncited claim fails to
  parse rather than failing review.**

## The publishing gate

Drafts may be incomplete — that is what a draft is. These rules apply only when
something claims `meta.status === 'published'`, which is the moment it becomes
reachable by a user:

1. **≥ 4 qualifying sources.** Anecdote and case reports are stored but do not
   count toward the minimum.
2. **Every `SourceRef` resolves** to a real source on the same compound.
3. **A human signed off** — `lastReviewedAt` and `reviewedBy` are both set.
4. **Both reading levels present** — simple and scientific.
5. **All four jurisdictions covered** — US, UK, EU, AU.
6. **At least one claim**, and every claim's goal appears in `goals[]`.

Run `npm run validate:content` to check. It exits non-zero on failure, so it
belongs in CI.

### Why drafts cannot leak

Three independent layers, because one is not enough:

1. `src/data/catalog.ts` filters by status on every read. Components never
   import from `content/` directly.
2. Postgres row-level security exposes only `status = 'published'`. A draft is
   not hidden from the client — it is *unreachable* by it.
3. `generateStaticParams` only lists published slugs, so a draft is never
   written into the static site at all.

In development, drafts render with a `DRAFT` badge so layouts can be built
against real shapes. In a production build they are invisible.

## Interactions

Interactions live in `content/interactions/`, not inside compounds, because an
interaction belongs to a *pair* — nesting it means writing it twice and letting
the copies drift.

Pairs are stored once in alphabetical order (`a < b`), enforced by both the Zod
schema and a Postgres `CHECK` constraint, so a lookup never depends on argument
order and the same pair cannot be entered twice under two orderings.

`provenance` is the scaling story:

- **`hand-authored`** — you wrote it because the pair matters. Requires a source
  when published.
- **`pathway-overlap`** — inferred from shared mechanism. Lower confidence,
  always labelled "inferred" in the UI, and **may never carry `avoid` or
  `contraindicated`**. The dangerous end of the scale must be hand-authored with
  a source. Enforced in both the Zod schema and the database, because a bad row
  reaching a user is the failure mode that actually hurts someone.

## Authoring a compound

1. Copy an existing file in `content/compounds/`.
2. Write it with `meta.status: 'draft'`. The `satisfies Compound` at the bottom
   gives you autocomplete and immediate type errors.
3. Register it in `content/index.ts`.
4. Run `npm run validate:content`.
5. When it is complete and reviewed, set `status: 'published'`, add
   `lastReviewedAt` and `reviewedBy`, and re-run the validator.

The two compounds currently in `content/` are rough drafts written as layout
fixtures. Their sources are placeholders. Replace them.
