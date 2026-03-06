/**
 * Design System Spacing, Border Radius & Box Shadow — Single source of truth for all packages.
 *
 * Used in:
 * - tailwind.config (transactional emails, main app)
 */

export const spacing = {
  '18': '4.5rem',
  '22': '5.5rem',
  '128': '32rem',
  '144': '36rem',
} as const;

export const borderRadius = {
  '2xl': '1rem',
  '4xl': '2rem',
} as const;

export const boxShadow = {
  card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  'card-md':
    '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
} as const;
