/**
 * Design tokens.
 *
 * Deliberately minimal -- this exists to keep spacing and colour consistent
 * while the foundation is built, NOT as a design system. Expect the developer
 * who takes this over to replace it wholesale. The value here is that every
 * component reads from tokens, so swapping them is a one-file change.
 */

export const colors = {
  bg: '#0E1116',
  surface: '#161B22',
  surfaceAlt: '#1C232C',
  border: '#2A3139',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  accent: '#4FD1C5',
  accentText: '#0E1116',

  riskLow: '#3FB950',
  riskModerate: '#D29922',
  riskHigh: '#F85149',
  riskUnknown: '#8B949E',

  draft: '#A371F7',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16 } as const;

export const type = {
  title: { fontSize: 26, fontWeight: '700' },
  heading: { fontSize: 19, fontWeight: '700' },
  subheading: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '600' },
} as const;

export function riskColor(category: string): string {
  switch (category) {
    case 'low':
      return colors.riskLow;
    case 'moderate':
      return colors.riskModerate;
    case 'high':
      return colors.riskHigh;
    default:
      return colors.riskUnknown;
  }
}
