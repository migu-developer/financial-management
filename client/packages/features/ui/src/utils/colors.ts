/**
 * Design System Colors — Single source of truth for all packages.
 *
 * Used in:
 *
 * Numeric scale  → used by the mobile/web app (e.g. bg-primary-600, text-accent-400)
 * Named aliases  → kept for backward compat with transactional email templates
 *                  (e.g. bg-primary-dark, text-primary-pale, border-primary-light)
 */

// ─── Generic — white and black ─────────────────────────────────────────────────
export const generic = {
  white: '#FFFFFF',
  black: '#000000',
  error: '#EF4444',
  subtle: '#e2e8f0',
  providers: {
    google: '#EA4335',
    facebook: '#1877F2',
    microsoft: '#00A4EF',
    apple: '#FFFFFF',
  },
};

// ─── Brand Primary — teal / blue-green ───────────────────────────────────────

export const primary = {
  // Numeric scale
  50: '#E8F7F2',
  100: '#d4f0e8',
  200: '#a8e1d0',
  300: '#7ed0bc',
  400: '#63D6A6',
  500: '#42B496',
  600: '#2A7C8F',
  700: '#2D6C7D',
  800: '#1e4f5e',
  900: '#12323c',
  950: '#091920',
  // Named aliases (transactional email templates)
  DEFAULT: '#2A7C8F', // = 600
  dark: '#2D6C7D', // = 700
  mid: '#42B496', // = 500
  light: '#63D6A6', // = 400
  pale: '#E8F7F2', // = 50
};

// ─── Brand Accent — lavender ──────────────────────────────────────────────────

export const accent = {
  // Numeric scale
  50: '#F5F0FC',
  100: '#EDE4F8',
  200: '#E3D6F5',
  300: '#D9C8F2',
  400: '#C9B1EB',
  500: '#B89BE0',
  600: '#9A7CD4',
  700: '#7E5FC6',
  // Named aliases (transactional email templates)
  DEFAULT: '#C9B1EB', // = 400
  light: '#D9C8F2', // = 300
  pale: '#F5F0FC', // = 50
};

// ─── Neutrals — gray scale ────────────────────────────────────────────────────

export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
};

// ─── Surface / Background tokens (light & dark) ───────────────────────────────

export const surface = {
  light: {
    background: neutral[50],
    card: generic.white,
    border: neutral[200],
    subtle: neutral[100],
  },
  dark: {
    background: '#0f172a', // slate-900
    card: '#1e293b', // slate-800
    border: '#334155', // slate-700
    subtle: '#1e293b', // slate-800
  },
};

// ─── Text tokens (light & dark) ───────────────────────────────────────────────

export const textTokens = {
  light: {
    primary: neutral[900],
    secondary: neutral[600],
    muted: neutral[400],
    inverse: generic.white,
  },
  dark: {
    primary: generic.white,
    secondary: '#CBD5E1', // slate-300
    muted: '#64748B', // slate-500
    inverse: neutral[900],
  },
};

// ─── Semantic — success (emerald) ─────────────────────────────────────────────

export const success = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  500: '#10B981',
  DEFAULT: '#10B981', // emerald-500
};

// ─── Semantic — warning (amber) ───────────────────────────────────────────────

export const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  500: '#F59E0B',
  DEFAULT: '#F59E0B', // amber-500
};

// ─── UI utility tokens ─────────────────────────────────────────────────────────
// Specific one-off colors for UI components (not part of Tailwind theme).

export const uiTokens = {
  sunColor: '#FCD34D', // amber-300  — ThemeToggle light-mode icon
  moonColor: '#94A3B8', // slate-400 — ThemeToggle dark-mode icon
};

// ─── Tailwind-compatible colors object ────────────────────────────────────────
// Spread this into `theme.extend.colors` in both tailwind configs.

export const colors = {
  primary,
  accent,
  neutral,
  success,
  warning,
  link: primary[600],
  'link-hover': primary[500],
};
