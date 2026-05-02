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

- Use `Platform.OS` or utility helpers (`isWeb`, `isMobile`).
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

## Design Tokens — No Hardcoded Values

- NEVER hardcode colors -- use tokens from `@features/ui/utils/colors`
  (e.g., `colors.primary[500]`, `colors.semantic.error`).
- NEVER hardcode spacing, radius, shadows, or font sizes -- use tokens from
  `@features/ui/utils/colors` (`space`, `radius`, `boxShadow`, `iconSize`).
- NEVER hardcode user-facing strings -- always use `useTranslation()` keys.
- Reusable components MUST go in `@features/ui` (atoms/molecules), not in
  individual feature packages. Feature-specific components stay in the feature.

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
