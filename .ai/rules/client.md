# Client Rules -- Expo + React Native App

## Scope

Applies to `client/main/` and `client/packages/features/` (ui, landing,
auth, dashboard).

## Routing

- **Expo Router** with file-based routing under `client/main/app/`.
- Layout files: `_layout.tsx`.
- Not-found page: `+not-found.tsx`.
- Route groups use parentheses: `(tabs)/`, `(auth)/`.

## Styling

- **NativeWind v4** (Tailwind CSS for React Native) -- always use `className` prop.
- Tailwind v4 with `@tailwindcss/postcss`.
- Design system colors defined in `@features/ui/utils/colors`.
- NEVER use inline `style` objects when a Tailwind class exists.

## Component Architecture -- Atomic Design

```
atoms/        # Buttons, inputs, icons, text
molecules/    # Form fields, cards, list items
organisms/    # Forms, headers, navigation bars
templates/    # Page layouts with slots
pages/        # Full screens (in app/ routes)
```

## Provider Pattern

- `AuthProvider` -- authentication state, Cognito session.
- `ExpenseProvider` -- expense CRUD state management.
- `ThemeContext` -- light/dark theme switching.
- Providers wrap the app in `client/main/app/providers/`.

## Internationalization

- Use `useTranslation()` hook from `@packages/i18n`.
- Translation keys are namespaced by feature.
- NEVER hardcode user-facing strings -- always use translation keys.

## Platform Detection

- ALWAYS use platform helpers from `@packages/utils` (`isWeb()`, `isMobile()`,
  `isIOS()`, `isAndroid()`) for platform detection. NEVER use `Platform.OS`
  directly — the helpers provide a consistent, tested API.
- Inside React components, ALWAYS wrap platform helpers in `useMemo`:
  `const isPlatformWeb = useMemo(() => isWeb(), [])`. This avoids
  re-evaluation on every render.
- Prefer responsive Tailwind classes over platform branching when possible.

## peerDependencies

- Feature packages (`@features/ui`, `@features/landing`, `@features/auth`)
  MUST use `"react": "catalog:"` in their `peerDependencies`.
- This ensures pnpm resolves a single react-native virtual store entry,
  which is required for NativeWind type augmentation to work globally.

## Commands

```bash
# Start dev server
pnpm --filter @client/main dev

# Build
pnpm --filter @client/main build

# Lint
pnpm --filter @client/main lint

# Type-check
pnpm --filter @client/main typecheck

# Test (uses Jest 29, NOT Jest 30 from catalog)
pnpm --filter @client/main test
```

## Design Tokens — STRICTLY No Hardcoded Values

This is CRITICAL. Violations of these rules create visual inconsistency and
make the design system useless. Every PR will be rejected if these are broken.

- NEVER use hardcoded color strings (`'#1e293b'`, `'#ffffff'`, `'red'`) in
  any component. ALWAYS use tokens from `@features/ui/utils/colors`:
  `primary[500]`, `neutral[400]`, `surface.dark.card`, `generic.error`, etc.
- NEVER use hardcoded font sizes (`fontSize: 12`, `fontSize: 16`). ALWAYS
  use `fontSizeScale` from `@features/ui/utils/spacing`:
  `fontSizeScale.xs` (12), `fontSizeScale.sm` (14), `fontSizeScale.base` (16).
- NEVER use hardcoded spacing (`padding: 8`, `margin: 16`). Use `space`
  tokens from `@features/ui/utils/spacing`: `space.sm`, `space.md`, etc.
  Exception: Tailwind classes (`px-4`, `mt-2`) are acceptable.
- NEVER use hardcoded font weights (`fontWeight: '600'`, `fontWeight: '700'`).
  ALWAYS use `fontWeight` from `@features/ui/utils/typography`:
  `fontWeight.normal` ('400'), `fontWeight.medium` ('500'),
  `fontWeight.semibold` ('600'), `fontWeight.bold` ('700').
  Exception: Tailwind classes (`font-semibold`, `font-bold`) are acceptable.
- NEVER use hardcoded border radius (`borderRadius: 8`). Use `radius` tokens
  from `@features/ui/utils/spacing`: `radius.sm` (4), `radius.md` (8),
  `radius.lg` (12), `radius.xl` (16).
- NEVER hardcode shadows. Use `boxShadow` tokens.

Token source files (single source of truth):

- Colors: `@features/ui/utils/colors`
- Spacing, fontSize, radius, iconSize: `@features/ui/utils/spacing`
- FontWeight, fontFamily: `@features/ui/utils/typography`
- NEVER hardcode user-facing strings -- always use `useTranslation()` keys.
- Reusable components MUST go in `@features/ui` (atoms/molecules), not in
  individual feature packages. Feature-specific components stay in the feature.
- Every generic input type (text, date, number, selector, etc.) MUST exist as
  an atom in `@features/ui` before being used in any feature. If it does not
  exist, create it first. NEVER inline a generic input directly in a feature.

## Loading States — Skeleton Loaders

- Every page/section that fetches data MUST show a skeleton loader during
  initial load. NEVER show a blank screen, a spinner alone, or "Loading...".
- Use the `Skeleton` atom from `@features/ui` as the building block.
- Skeleton loaders MUST mimic the layout of the final content (same card
  sizes, same row counts, same spacing) so the UI doesn't shift on load.
- Pattern: `if (loading && !data)` → show skeleton, not a spinner.
- Consistent across all features: expenses list, dashboard metrics, etc.

## Testing Conventions

- Test files are **co-located** next to the source: `component.tsx` →
  `component.test.tsx` (same directory). Do NOT create `__tests__/` folders.
- Exception: `client/main/` uses `client/main/tests/` with a mirror of the
  `app/` structure because Expo Router treats files in `app/` as routes.
- Test with `ts-jest` (v29). Config lives in `client/main/jest.config.ts`.
- Every new component, hook, provider, and use case MUST have a unit test.

## Constraints

- NEVER import from `services/` directly -- use API calls or shared types
  from `@packages/models`.
- NEVER add `react` as a direct dependency in feature packages -- use
  `peerDependencies` with `catalog:`.
- NEVER use `require()` -- use ES module imports.
- NEVER use relative paths (`../../`) -- use path aliases (`@features/<name>`,
  `@packages/<name>`, `@client/main`).
- Keep feature packages self-contained; cross-feature imports go through
  `@packages/utils` or `@packages/models`.
