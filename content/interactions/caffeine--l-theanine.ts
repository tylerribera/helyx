import type { Interaction } from '@/schema';

/**
 * ROUGH DRAFT -- layout fixture only. Not reviewed.
 *
 * Note the filename and the `a`/`b` ordering: pairs are stored once, in
 * alphabetical order, so a lookup never depends on which compound you start
 * from and the same pair cannot be entered twice under two orderings.
 */
const caffeineTheanine = {
  a: 'caffeine',
  b: 'l-theanine',
  risk: 'synergistic',
  note: 'DRAFT. The most commonly cited pairing in the catalog. Theanine is generally reported to blunt the jitteriness and anxiety of caffeine while alertness is retained. Typically dosed around 2:1 theanine to caffeine. Needs sourcing and a proper write-up.',
  sources: ['todo-1'],
  provenance: 'hand-authored',
  sharedPathways: [],
  sourceRecords: [
    {
      id: 'todo-1',
      title: 'PLACEHOLDER -- replace with a real citation',
      url: 'https://example.com/todo',
      publisher: 'TODO',
      year: 2020,
      evidence: 'narrative-review',
      takeaway: 'Placeholder source so the draft parses. Not a real citation.',
    },
  ],
  meta: {
    status: 'draft',
    lastUpdatedAt: '2026-09-21',
  },
} satisfies Interaction;

export default caffeineTheanine;
