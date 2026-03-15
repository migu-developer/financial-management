/**
 * Design System Spacing, Border Radius, Box Shadow & Layout — Single source of truth.
 *
 * React Native uses density-independent pixels (dp). These map 1:1 to CSS px
 * in layout terms: a value of 16 in RN feels the same as 16px (1rem) on web.
 *
 * Physical pixels vary by screen density:
 * ┌──────────┬───────────────┬───────────────┬──────────────────┐
 * │ RN value │ mdpi (1x)     │ xhdpi (2x)    │ xxxhdpi (4x)     │
 * ├──────────┼───────────────┼───────────────┼──────────────────┤
 * │ 4        │ 4px           │ 8px           │ 16px             │
 * │ 8        │ 8px           │ 16px          │ 32px             │
 * │ 16       │ 16px          │ 32px          │ 64px             │
 * │ 24       │ 24px          │ 48px          │ 96px             │
 * │ 48       │ 48px          │ 96px          │ 192px            │
 * └──────────┴───────────────┴───────────────┴──────────────────┘
 *
 * Used in:
 * - tailwind.config (Tailwind-compatible rem objects: spacing, borderRadius, boxShadow)
 * - Inline styles (numeric dp objects: space, ds, fontSize, maxWidth, iconSize)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TAILWIND CONFIG — rem string objects (used by tailwind.config.ts theme.extend)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// REACT NATIVE — numeric dp objects (used in inline styles)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Base scale (4px increments, matches Tailwind utility numbering) ───────
// Naming: "s" + number = value in dp (e.g. s6 = 6dp). Semantic names (xs, sm, md, lg, xl, 2xl, 3xl, 4xl) for main steps.

export const space = {
  /** 0dp — no spacing */
  zero: 0,
  /** 2dp — hairline gap (Tailwind: 0.5) */
  s2: 2,
  /** 4dp — minimal spacing (Tailwind: 1) */
  s4: 4,
  /** 6dp — tight spacing (Tailwind: 1.5) */
  s6: 6,
  /** 8dp — xs spacing (Tailwind: 2) */
  xs: 8,
  /** 10dp — (Tailwind: 2.5) */
  s10: 10,
  /** 12dp — sm spacing (Tailwind: 3) */
  sm: 12,
  /** 14dp — (Tailwind: 3.5) */
  s14: 14,
  /** 16dp — md / base ≈ 1rem (Tailwind: 4) */
  md: 16,
  /** 20dp — (Tailwind: 5) */
  s20: 20,
  /** 24dp — lg ≈ 1.5rem (Tailwind: 6) */
  lg: 24,
  /** 28dp — (Tailwind: 7) */
  s28: 28,
  /** 32dp — xl ≈ 2rem (Tailwind: 8) */
  xl: 32,
  /** 36dp — (Tailwind: 9) */
  s36: 36,
  /** 40dp — (Tailwind: 10) */
  s40: 40,
  /** 48dp — 2xl ≈ 3rem (Tailwind: 12) */
  '2xl': 48,
  /** 56dp — (Tailwind: 14) */
  s56: 56,
  /** 64dp — 3xl ≈ 4rem (Tailwind: 16) */
  '3xl': 64,
  /** 80dp — (Tailwind: 20) */
  s80: 80,
  /** 96dp — 4xl ≈ 6rem (Tailwind: 24) */
  '4xl': 96,
} as const;

// ─── Font sizes (dp values matching Tailwind text-{name}) ─────────────────

export const fontSizeScale = {
  /** 10dp — tiny labels, badges */
  '2xs': 10,
  /** 12dp — captions, footnotes, error text (text-xs) */
  xs: 12,
  /** 14dp — body small, form labels (text-sm) */
  sm: 14,
  /** 16dp — body, input text (text-base) */
  base: 16,
  /** 18dp — large body (text-lg) */
  lg: 18,
  /** 20dp — subheadings (text-xl) */
  xl: 20,
  /** 24dp — headings (text-2xl) */
  '2xl': 24,
  /** 30dp — large headings (text-3xl) */
  '3xl': 30,
  /** 36dp — hero headings (text-4xl) */
  '4xl': 36,
  /** 48dp — display (text-5xl) */
  '5xl': 48,
  /** 64dp — display (text-6xl) */
  '6xl': 64,
  /** 80dp — display (text-7xl) */
  '7xl': 80,
  /** 96dp — display (text-8xl) */
  '8xl': 96,
  /** 112dp — display (text-9xl) */
  '9xl': 112,
  /** 128dp — display (text-10xl) */
  '10xl': 128,
} as const;

// ─── Icon sizes ────────────────────────────────────────────────────────────

export const iconSize = {
  /** 14dp — inline micro icon (chevron, etc.) */
  xs: 14,
  /** 16dp — inline small icon (info, etc.) */
  sm: 16,
  /** 20dp — standard icon (eye toggle, nav) */
  md: 20,
  /** 24dp — prominent icon */
  lg: 24,
  /** 32dp — large decorative icon */
  xl: 32,
  /** 40dp — extra large icon */
  '2xl': 40,
} as const;

// ─── Border radius (dp values for inline styles) ──────────────────────────

export const radius = {
  /** 4dp — subtle rounding */
  sm: 4,
  /** 8dp — standard rounding (rounded-lg) */
  md: 8,
  /** 12dp — card/input rounding (rounded-xl) */
  lg: 12,
  /** 16dp — modal/sheet top corners (rounded-2xl) */
  xl: 16,
  /** 9999dp — pill / fully rounded */
  full: 9999,
} as const;

// ─── Width constants (deprecated — use maxWidth) ───────────────────────────

export const width = {
  xxxs: {
    small: 160,
    medium: 200,
    large: 240,
  },
  xxs: { small: 240, medium: 280, large: 320 },
  xs: { small: 320, medium: 400, large: 448 },
  sm: { small: 448, medium: 600, large: 900 },
  md: { small: 900, medium: 1200, large: 1500 },
  lg: { small: 1200, medium: 1500, large: 1800 },
  xl: { small: 1500, medium: 1800, large: 2100 },
} as const;

// ─── Max widths (layout breakpoints in dp) ─────────────────────────────────

export const maxWidth = {
  /** 320dp — small popup, info modal */
  popup: 320,
  /** 375dp — iPhone SE width */
  phoneSm: 375,
  /** 390dp — iPhone 14/15 width */
  phoneMd: 390,
  /** 430dp — iPhone Plus/Max width */
  phoneLg: 430,
  /** 448dp — form container, auth cards (28rem) */
  form: 448,
  /** 640dp — medium content container (sm breakpoint) */
  sm: 640,
  /** 768dp — tablet (md breakpoint) */
  md: 768,
  /** 1024dp — laptop (lg breakpoint) */
  lg: 1024,
  /** 1280dp — desktop (xl breakpoint) */
  xl: 1280,
} as const;

// ─── ZIndex constants ────────────────────────────────────────────────────────
export const zIndex = {
  /** 1 — lowest */
  lowest: 1,
  /** 10 — low */
  low: 10,
  /** 20 — medium */
  medium: 20,
  /** 30 — high */
  high: 30,
  /** 100 — big */
  big: 100,
} as const;
