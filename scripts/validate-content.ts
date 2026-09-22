/**
 * Content gate. Run with `npm run validate:content`.
 *
 * Validates every compound and interaction against the schema, then applies the
 * publishing rules to anything marked `published`. Exits non-zero on failure, so
 * this can sit in CI and block a merge.
 *
 * Drafts are checked for structural validity but are exempt from the publishing
 * rules -- an incomplete draft is not an error, it is a draft.
 */
import { z } from 'zod';
import { compounds, interactions } from '../content';
import { Interaction, PublishableCompound, pairKey } from '../src/schema';

type Failure = { subject: string; problems: string[] };

const failures: Failure[] = [];
const warnings: string[] = [];

function record(subject: string, error: z.ZodError) {
  failures.push({
    subject,
    problems: error.issues.map((i) => {
      const path = i.path.join('.');
      return path ? `${path}: ${i.message}` : i.message;
    }),
  });
}

/* --- compounds --- */

const slugs = new Set(compounds.map((c) => c.slug));
const seen = new Set<string>();

for (const compound of compounds) {
  const result = PublishableCompound.safeParse(compound);
  if (!result.success) record(`compound "${compound.slug}"`, result.error);

  if (seen.has(compound.slug)) {
    failures.push({ subject: `compound "${compound.slug}"`, problems: ['duplicate slug'] });
  }
  seen.add(compound.slug);

  // Cross-references must point at compounds that exist.
  const refs: [string, string[]][] = [
    ['family', compound.family],
    ['doNotPairWith', compound.doNotPairWith],
    ['commonPairs', compound.commonPairs],
  ];
  for (const [field, list] of refs) {
    for (const ref of list) {
      if (!slugs.has(ref)) {
        failures.push({
          subject: `compound "${compound.slug}"`,
          problems: [`${field} references unknown compound "${ref}"`],
        });
      }
    }
  }

  // A compound cannot both recommend and forbid the same pairing.
  for (const pair of compound.commonPairs) {
    if (compound.doNotPairWith.includes(pair)) {
      failures.push({
        subject: `compound "${compound.slug}"`,
        problems: [`"${pair}" appears in both commonPairs and doNotPairWith`],
      });
    }
  }

  // Sources that nothing cites are dead weight; flag but do not fail.
  const cited = new Set<string>([
    ...compound.claims.flatMap((c) => c.sources),
    ...compound.dosing.flatMap((d) => d.sources),
    ...compound.sideEffects.flatMap((s) => s.sources),
    ...compound.legal.flatMap((l) => l.sources),
    ...compound.sport.flatMap((s) => s.sources),
    ...compound.buying.flatMap((b) => b.sources),
    ...compound.risk.sources,
    ...(compound.halfLife?.sources ?? []),
    ...(compound.kinetics?.sources ?? []),
  ]);
  for (const source of compound.sources) {
    if (!cited.has(source.id)) {
      warnings.push(`compound "${compound.slug}": source "${source.id}" is never cited`);
    }
  }
}

/* --- interactions --- */

const pairs = new Set<string>();

for (const interaction of interactions) {
  const label = `interaction "${interaction.a} + ${interaction.b}"`;
  const result = Interaction.safeParse(interaction);
  if (!result.success) record(label, result.error);

  for (const slug of [interaction.a, interaction.b]) {
    if (!slugs.has(slug)) {
      failures.push({ subject: label, problems: [`references unknown compound "${slug}"`] });
    }
  }

  const key = pairKey(interaction.a, interaction.b).join('|');
  if (pairs.has(key)) failures.push({ subject: label, problems: ['duplicate pair'] });
  pairs.add(key);

  // A hard block on a compound should have a matching interaction record
  // explaining why, otherwise the warning has no reasoning behind it.
  for (const compound of compounds) {
    for (const blocked of compound.doNotPairWith) {
      const blockKey = pairKey(compound.slug, blocked).join('|');
      if (!pairs.has(blockKey) && interactions.every((i) => pairKey(i.a, i.b).join('|') !== blockKey)) {
        warnings.push(
          `compound "${compound.slug}" forbids "${blocked}" but no interaction record explains why`,
        );
      }
    }
  }
}

/* --- report --- */

const published = compounds.filter((c) => c.meta.status === 'published');
const drafts = compounds.filter((c) => c.meta.status !== 'published');

console.log(`\n  ${compounds.length} compounds, ${interactions.length} interactions`);
console.log(`  ${published.length} published, ${drafts.length} not published\n`);

for (const warning of [...new Set(warnings)]) {
  console.log(`  warn  ${warning}`);
}
if (warnings.length) console.log('');

if (failures.length) {
  for (const failure of failures) {
    console.error(`  FAIL  ${failure.subject}`);
    for (const problem of failure.problems) console.error(`        ${problem}`);
  }
  console.error(`\n  ${failures.length} item(s) failed validation.\n`);
  process.exit(1);
}

console.log('  Content valid.\n');
