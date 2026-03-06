/**
 * Design System Typography — Single source of truth for all packages.
 *
 * Used in:
 * - tailwind.config (transactional emails, main app)
 */

export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  display: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
};

/**
 * Design System Font Size (Tailwind v3 / NativeWind) — rem-based with absolute rem lineHeights.
 * Same sizes as `fontSize` but using rem units instead of px, as expected by NativeWind / Tailwind v3.
 *
 * Conversions (base 16px):
 *   xs=12px→0.75rem  sm=14px→0.875rem  base=16px→1rem  lg=18px→1.125rem
 *   xl=20px→1.25rem  2xl=24px→1.5rem   3xl=28px→1.75rem  4xl=32px→2rem
 */
export const fontSizeV3: Record<string, [string, { lineHeight: string }]> = {
  xs: ['0.75rem', { lineHeight: '1.125rem' }],
  sm: ['0.875rem', { lineHeight: '1.313rem' }],
  base: ['1rem', { lineHeight: '1.6rem' }],
  lg: ['1.125rem', { lineHeight: '1.688rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '1.95rem' }],
  '3xl': ['1.75rem', { lineHeight: '2.188rem' }],
  '4xl': ['2rem', { lineHeight: '2.4rem' }],
} as const;

/**
 * Design System Font Size v4.2.1 — Single source of truth for all packages.
 *
 * Used in:
 * - tailwind.config (main app)
 */
export const fontSize = {
  xs: ['12px', { lineHeight: '1.5' }],
  sm: ['14px', { lineHeight: '1.5' }],
  base: ['16px', { lineHeight: '1.6' }],
  lg: ['18px', { lineHeight: '1.5' }],
  xl: ['20px', { lineHeight: '1.4' }],
  '2xl': ['24px', { lineHeight: '1.3' }],
  '3xl': ['28px', { lineHeight: '1.25' }],
  '4xl': ['32px', { lineHeight: '1.2' }],
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
