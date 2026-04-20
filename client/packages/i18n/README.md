# @packages/i18n

Internationalization package for the Financial Management application. Wraps i18next and react-i18next to provide type-safe translations in English and Spanish across all feature packages.

## Supported locales

| Code | Language                    |
| ---- | --------------------------- |
| `en` | English (default, fallback) |
| `es` | Spanish                     |

## Namespaces

| Namespace   | Description                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------- |
| `login`     | Authentication screens (sign-in, sign-up, forgot password, MFA, validation messages)         |
| `dashboard` | Dashboard screens (expenses, filters, errors, empty states)                                  |
| `landing`   | Landing and legal pages (hero, features, how-it-works, CTA, privacy, terms, contact, footer) |
| `ui`        | Shared UI components (buttons, labels, theme toggle, language selector)                      |

## i18next configuration

Configured in `src/config.ts`:

- **Default language**: `en`
- **Fallback language**: `en`
- **Interpolation**: `escapeValue: false` (React handles XSS)
- **Init mode**: Synchronous (`initImmediate: false`)
- **Backend**: Bundled resources (no lazy loading)

## Locale file structure

```
src/
  config.ts                     i18next init + resource bundling
  index.ts                      Public exports (i18n instance, useTranslation, types)
  locales/
    en/
      index.ts                  Aggregates all English namespaces
      login/index.ts            Login namespace translations
      dashboard/index.ts        Dashboard namespace translations
      landing/index.ts          Landing namespace translations
      ui/index.ts               UI namespace translations
    es/
      index.ts                  Aggregates all Spanish namespaces
      login/index.ts            Login namespace translations
      dashboard/index.ts        Dashboard namespace translations
      landing/index.ts          Landing namespace translations
      ui/index.ts               UI namespace translations
```

## Usage

```typescript
import { useTranslation } from '@packages/i18n';

function MyComponent() {
  const { t } = useTranslation('login');
  return <Text>{t('signIn.title')}</Text>;
}
```

### Changing language

```typescript
import { i18n } from '@packages/i18n';

await i18n.changeLanguage('es');
```

Language changes are persisted via `@packages/utils` `preferenceStorage` in the `PreferencesProvider` at the app root.

## Exported types

| Type                   | Description                                   |
| ---------------------- | --------------------------------------------- |
| `AppResources`         | Full resource object type (`{ en, es }`)      |
| `SupportedLanguage`    | `'en' \| 'es'`                                |
| `Namespace`            | `'login' \| 'dashboard' \| 'landing' \| 'ui'` |
| `LoginTranslationEn`   | Shape of English login translations           |
| `LoginTranslationEs`   | Shape of Spanish login translations           |
| `LandingTranslationEn` | Shape of English landing translations         |
| `LandingTranslationEs` | Shape of Spanish landing translations         |

## Dependencies

### Internal

None (standalone)

### External

i18next, react-i18next

### Peer

react

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

Each locale namespace has a co-located test file that verifies translation key structure and content. The i18next config is also tested.
