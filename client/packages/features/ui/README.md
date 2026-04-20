# @features/ui

Design system and shared UI component library for the Financial Management application. Provides atomic design components, color tokens, typography scale, spacing utilities, and theme management. Used by all feature packages.

## Components

### Atoms (21)

| Component          | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `Avatar`           | User avatar with initials fallback                   |
| `Badge`            | Status or count badge                                |
| `Button`           | Primary action button with variants                  |
| `Card`             | Container card with shadow                           |
| `EmptyState`       | Empty state placeholder with icon and message        |
| `FilterChip`       | Selectable filter tag                                |
| `FormInput`        | Labeled text input with validation error display     |
| `Icon`             | Expo vector icon wrapper                             |
| `InfoPopup`        | Informational popup/tooltip                          |
| `LanguageSelector` | Language picker (en/es)                              |
| `LoadingSpinner`   | Activity indicator                                   |
| `Modal`            | Overlay modal dialog                                 |
| `PasswordInput`    | Password input with show/hide toggle                 |
| `PhoneInput`       | International phone input with country code selector |
| `SearchInput`      | Search text input with icon                          |
| `SelectableOption` | Radio/checkbox option item                           |
| `SelectorField`    | Dropdown-style selector field                        |
| `Skeleton`         | Animated loading placeholder                         |
| `Text`             | Typography component with design system styles       |
| `TextInputBase`    | Base text input primitive                            |
| `ThemeToggle`      | Light/dark mode toggle switch                        |

### Molecules (4)

| Component          | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `ConfirmDialog`    | Confirmation modal with cancel/confirm actions             |
| `CurrencyDisplay`  | Formatted currency amount display                          |
| `FilterBar`        | Horizontal scrollable filter chip bar                      |
| `SocialAuthButton` | OAuth provider button (Google, Facebook, Apple, Microsoft) |

## Color tokens

All colors are defined in `src/utils/colors.ts` as a single source of truth.

### Primary (teal/blue-green)

50 through 950 numeric scale plus named aliases (DEFAULT=600, dark=700, mid=500, light=400, pale=50).

### Accent (lavender)

50 through 700 numeric scale plus named aliases (DEFAULT=400, light=300, pale=50).

### Neutral (gray)

50 through 900 numeric scale.

### Semantic

- **success** (emerald): 50, 100, 500
- **warning** (amber): 50, 100, 500

### Surface tokens (light and dark)

| Token      | Light       | Dark                  |
| ---------- | ----------- | --------------------- |
| background | neutral-50  | slate-900 (`#0f172a`) |
| card       | white       | slate-800 (`#1e293b`) |
| border     | neutral-200 | slate-700 (`#334155`) |
| subtle     | neutral-100 | slate-800             |

### Text tokens (light and dark)

| Token     | Light       | Dark        |
| --------- | ----------- | ----------- |
| primary   | neutral-900 | white       |
| secondary | neutral-600 | slate-300   |
| muted     | neutral-400 | slate-500   |
| inverse   | white       | neutral-900 |

### Provider colors

Google (`#EA4335`), Facebook (`#1877F2`), Microsoft (`#00A4EF`), Apple (`#FFFFFF`)

### Generic

white, black, error (`#EF4444`), subtle (`#e2e8f0`)

## Typography scale

Defined in `src/utils/typography.ts`. Two variants:

### fontSizeV3 (rem-based, for NativeWind / Tailwind v3)

| Key  | Size     | Line height |
| ---- | -------- | ----------- |
| xs   | 0.75rem  | 1.125rem    |
| sm   | 0.875rem | 1.313rem    |
| base | 1rem     | 1.6rem      |
| lg   | 1.125rem | 1.688rem    |
| xl   | 1.25rem  | 1.75rem     |
| 2xl  | 1.5rem   | 1.95rem     |
| 3xl  | 1.75rem  | 2.188rem    |
| 4xl  | 2rem     | 2.4rem      |

### fontSize (px-based, for email templates)

xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (28px), 4xl (32px)

### Font weight

normal (400), medium (500), semibold (600), bold (700)

### Font family

System font stack: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif

## Spacing and layout

Defined in `src/utils/spacing.ts`:

- **space** -- Numeric dp scale from 0 to 96 (4dp increments, semantic names: xs=8, sm=12, md=16, lg=24, xl=32, 2xl=48, 3xl=64, 4xl=96)
- **spacing** -- Tailwind-compatible rem extensions (18, 22, 128, 144)
- **borderRadius** -- rem extensions for Tailwind (2xl=1rem, 4xl=2rem)
- **radius** -- Numeric dp values for inline styles (sm=4, md=8, lg=12, xl=16, full=9999)
- **boxShadow** -- Card shadow presets (card, card-md)
- **iconSize** -- xs=14, sm=16, md=20, lg=24, xl=32, 2xl=40
- **fontSizeScale** -- Numeric dp values from 2xs (10) to 10xl (128)
- **maxWidth** -- Layout breakpoints (popup=320, form=448, sm=640, md=768, lg=1024, xl=1280)
- **zIndex** -- Layering constants (lowest=1 through big=100)

## Theme management

### ThemeContext

Provides `colorScheme`, `toggleColorScheme()`, and `setColorScheme()` via `useThemeActions()` hook. Supports `'light'`, `'dark'`, and `'system'` themes.

The `ThemeContext` is a plain React context. The actual provider (`PreferencesProvider`) lives in `@client/main` and bridges NativeWind's `useColorScheme` with AsyncStorage persistence.

## Utilities

- **colors.ts** -- All color tokens and Tailwind-compatible `colors` object
- **typography.ts** -- Font family, size, and weight definitions
- **spacing.ts** -- Spacing, radius, shadow, icon size, and layout breakpoint tokens
- **constants.ts** -- `ColorScheme` enum (LIGHT, DARK, SYSTEM), `IconNames` enum
- **countries.ts** -- Priority country codes (CO, MX, AR, UY, FI) and full country name mapping for phone input

## Dependencies

### Internal

`@packages/i18n`, `@packages/utils`

### External

@expo/vector-icons, libphonenumber-js

## Scripts

| Script      | Command          | Description                 |
| ----------- | ---------------- | --------------------------- |
| `typecheck` | `tsc --noEmit`   | Type-check without emitting |
| `lint`      | `eslint .`       | Run ESLint                  |
| `lint:fix`  | `eslint . --fix` | Auto-fix lint errors        |
| `test`      | `jest`           | Run unit tests              |

## Testing

```bash
pnpm test
```

Every atom, molecule, utility module, and context has a co-located test file. Mocks for Expo modules and react-native are in `src/__mocks__/`.
