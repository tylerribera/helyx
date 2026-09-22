import type { Compound } from '@/schema';

/**
 * ROUGH DRAFT -- layout fixture only.
 *
 * Deliberately thin. Exists so the catalog and compound pages have something to
 * render while the UI is built. Nothing here has been reviewed, several fields
 * are missing on purpose, and `meta.status` is 'draft' so the publish gate keeps
 * it out of public views. Replace wholesale during the content pass.
 */
const lTheanine = {
  slug: 'l-theanine',
  name: 'L-Theanine',
  aliases: [
    { name: 'Theanine', kind: 'abbreviation' },
    { name: 'Suntheanine', kind: 'brand' },
    { name: 'theanin', kind: 'misspelling' },
  ],
  categories: ['amino-acid', 'anxiolytic'],
  family: ['caffeine'],

  definitions: {
    simple:
      'DRAFT. An amino acid found mostly in tea. Usually taken to take the edge off stimulants and feel calm without feeling sleepy. Best known for what it pairs with rather than what it does on its own.',
    scientific:
      'DRAFT. A glutamate analogue that crosses the blood-brain barrier and modulates GABAergic and dopaminergic tone. Associated with increased alpha-band EEG activity, a pattern linked to relaxed alertness rather than sedation. Needs a full mechanism write-up.',
  },

  drugClass: {
    value: 'Glutamate analogue',
    display: 'DRAFT. A tea-derived amino acid that calms without sedating.',
  },

  routes: [{ value: 'oral', display: 'Taken orally, usually as a capsule.' }],

  dosing: [
    {
      route: 'oral',
      low: 100,
      high: 200,
      unit: 'mg',
      frequency: 'as-needed',
      note: 'DRAFT -- dose range and the commonly cited 2:1 ratio with caffeine both need verifying.',
      sources: ['todo-1'],
    },
  ],

  sideEffects: [
    {
      effect: 'Headache',
      frequency: 'uncommon',
      severity: 'mild',
      sources: ['todo-1'],
    },
  ],

  buying: [],

  claims: [
    {
      id: 'theanine-stress',
      goal: 'stress-resilience',
      statement: 'DRAFT. May reduce self-reported stress in healthy adults.',
      strength: 'emerging',
      sources: ['todo-1'],
      anecdotal: false,
    },
    {
      id: 'theanine-focus-with-caffeine',
      goal: 'focus',
      statement: 'DRAFT. May improve attention when combined with caffeine.',
      strength: 'emerging',
      sources: ['todo-2'],
      anecdotal: false,
    },
  ],

  goals: ['stress-resilience', 'focus'],

  halfLife: { lowHours: 1, highHours: 1, note: 'DRAFT -- verify.', sources: ['todo-1'] },

  researchStatus: 'emerging',

  risk: {
    category: 'low',
    why: 'DRAFT. Generally well tolerated with a long history of dietary exposure through tea. Main practical caution is additive drowsiness with other sedating compounds. Needs a proper safety review.',
    sources: ['todo-1'],
  },

  doNotPairWith: [],
  downsideProtection: [],
  commonPairs: ['caffeine'],

  // Legal and sport coverage intentionally incomplete -- the publish gate
  // requires all four jurisdictions, which is part of what makes this a draft.
  legal: [],
  sport: [],

  sources: [
    {
      id: 'todo-1',
      title: 'PLACEHOLDER -- replace with a real citation',
      url: 'https://example.com/todo',
      publisher: 'TODO',
      year: 2020,
      evidence: 'narrative-review',
      takeaway: 'Placeholder source so the draft parses. Not a real citation.',
    },
    {
      id: 'todo-2',
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
    createdAt: '2026-09-21',
    lastUpdatedAt: '2026-09-21',
    handAuthored: false,
  },
} satisfies Compound;

export default lTheanine;
