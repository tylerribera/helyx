import type { Compound } from '@/schema';

/**
 * ROUGH DRAFT -- layout fixture only. See l-theanine.ts for the same caveats.
 * Nothing here is reviewed. Replace wholesale during the content pass.
 */
const caffeine = {
  slug: 'caffeine',
  name: 'Caffeine',
  aliases: [
    { name: '1,3,7-trimethylxanthine', kind: 'chemical' },
    { name: 'caffiene', kind: 'misspelling' },
  ],
  categories: ['stimulant'],
  family: ['l-theanine'],

  definitions: {
    simple:
      'DRAFT. The most widely used stimulant in the world. Blocks the signal that makes you feel tired, which is why it increases alertness rather than adding energy. Tolerance builds quickly.',
    scientific:
      'DRAFT. A non-selective adenosine receptor antagonist acting primarily at A1 and A2A. Downstream effects include increased dopaminergic and noradrenergic signalling. Receptor upregulation drives rapid tolerance. Needs a full pharmacokinetics write-up.',
  },

  drugClass: {
    value: 'Adenosine receptor antagonist',
    display: 'DRAFT. A stimulant that blocks the brain signal driving sleep pressure.',
  },

  routes: [{ value: 'oral', display: 'Taken orally, as a beverage or capsule.' }],

  dosing: [
    {
      route: 'oral',
      low: 50,
      high: 200,
      unit: 'mg',
      frequency: 'as-needed',
      note: 'DRAFT -- needs verification, plus guidance on timing relative to sleep.',
      sources: ['todo-1'],
    },
  ],

  sideEffects: [
    { effect: 'Jitteriness', frequency: 'common', severity: 'mild', mitigation: 'Pair with L-theanine, or lower the dose.', sources: ['todo-1'] },
    { effect: 'Disrupted sleep', frequency: 'common', severity: 'moderate', mitigation: 'Avoid within roughly 8 hours of bed.', sources: ['todo-1'] },
    { effect: 'Withdrawal headache', frequency: 'common', severity: 'mild', sources: ['todo-1'] },
  ],

  buying: [],

  claims: [
    {
      id: 'caffeine-alertness',
      goal: 'focus',
      statement: 'DRAFT. Increases subjective alertness and reduces reaction time.',
      strength: 'well-established',
      sources: ['todo-1'],
      anecdotal: false,
    },
    {
      id: 'caffeine-endurance',
      goal: 'physical-endurance',
      statement: 'DRAFT. Improves endurance performance.',
      strength: 'well-established',
      sources: ['todo-1'],
      anecdotal: false,
    },
  ],

  goals: ['focus', 'energy', 'physical-endurance'],

  halfLife: { lowHours: 3, highHours: 6, note: 'DRAFT -- varies widely with CYP1A2 genotype.', sources: ['todo-1'] },

  researchStatus: 'well-established',

  risk: {
    category: 'moderate',
    why: 'DRAFT. Very well characterised and widely tolerated, but genuinely habit-forming, disruptive to sleep architecture at the wrong time of day, and a real cardiovascular caution at high doses. Needs a proper safety review.',
    sources: ['todo-1'],
  },

  doNotPairWith: [],
  downsideProtection: [],
  commonPairs: ['l-theanine'],

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
  ],

  meta: {
    status: 'draft',
    createdAt: '2026-09-21',
    lastUpdatedAt: '2026-09-21',
    handAuthored: false,
  },
} satisfies Compound;

export default caffeine;
