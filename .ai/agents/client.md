# Client Agent Instructions

## Scope

Expo + React Native app under `client/main/` and feature packages under
`client/packages/features/` (ui, landing, auth, dashboard).
Also covers `client/packages/i18n` and `client/packages/utils`.

## Commands

```bash
pnpm --filter @client/main dev          # Start Expo dev server
pnpm --filter @client/main build        # Build
pnpm --filter @client/main test         # Unit tests (Jest 29)
pnpm --filter @client/main lint         # Lint
pnpm --filter @client/main typecheck    # Type-check
```

## Patterns

### Expo Router (file-based routing)

- Routes live in `client/main/app/`.
- Layouts: `_layout.tsx`. Not-found: `+not-found.tsx`.
- Group routes with parentheses: `(tabs)/`, `(auth)/`.

### NativeWind v4 Styling

- Always use `className` prop for styling.
- Design tokens in `@features/ui/utils/colors`.
- Never use inline `style` when a Tailwind class exists.

### Atomic Design

- `atoms/` -- buttons, inputs, icons.
- `molecules/` -- form fields, cards.
- `organisms/` -- forms, headers, navigation.
- `templates/` -- page layouts with slots.
- `pages/` -- full screens (route files in `app/`).

### Provider Pattern

- `AuthProvider` -- Cognito session management.
- `ExpenseProvider` -- expense CRUD state.
- `ThemeContext` -- light/dark theme.

### i18n

- `useTranslation()` hook from `@packages/i18n`.
- Never hardcode user-facing strings.

## Constraints

- NEVER import from `services/` -- use API calls or `@packages/models`.
- NEVER add `react` as a direct dependency in feature packages -- use
  `peerDependencies` with `"catalog:"`.
- NEVER use `require()` -- use ES module imports only.
- NEVER cross-import between feature packages -- use `@packages/utils`
  or `@packages/models` as intermediaries.
- Tests use Jest 29 (NOT Jest 30 from catalog).

## Dependencies

- `expo: ~54.0.33`, `expo-router: ~6.0.23`
- `react: 19.1.0`, `react-native: 0.81.5`
- `nativewind: ^4.2.3`, `tailwindcss: ^4.2.2`
- `@packages/i18n`, `@packages/utils`, `@packages/models`
