# @packages/utils

Shared client utilities for the Financial Management application. Provides platform detection, cache storage with TTL, user preference persistence, and locale-aware date formatting.

## Modules

### Platform detection (`platform.ts`)

Enum and helper functions for detecting the current runtime platform.

| Export        | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `PlatformOS`  | Enum: `WEB`, `MOBILE`, `ANDROID`, `IOS`, `WINDOWS`, `MACOS` |
| `isWeb()`     | Returns `true` on web platform                              |
| `isMobile()`  | Returns `true` on iOS or Android                            |
| `isAndroid()` | Returns `true` on Android                                   |
| `isIOS()`     | Returns `true` on iOS                                       |
| `isWindows()` | Returns `true` on Windows                                   |
| `isMacOS()`   | Returns `true` on macOS                                     |

### Cache storage (`cache-storage.ts`)

Generic cache with TTL support backed by AsyncStorage. Works on both web (localStorage polyfill) and mobile (native storage).

```typescript
import { createCache, DEFAULT_CACHE_TTL } from '@packages/utils';

const cache = createCache<Currency[]>('expenses:currencies');

const cached = await cache.get(); // Returns null if expired or missing
await cache.set(currencies); // Write with automatic timestamp
await cache.invalidate(); // Force remove
```

| Export                      | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `createCache<T>(key, ttl?)` | Factory that returns `{ get, set, invalidate }` |
| `DEFAULT_CACHE_TTL`         | 5 minutes (300,000 ms)                          |

Cache entries are stored as JSON objects with a `cachedAt` timestamp. Expired entries are automatically removed on read.

### Preference storage (`preference-storage.ts`)

Thin wrapper around AsyncStorage for persisting user preferences.

| Method           | Key             | Description                                         |
| ---------------- | --------------- | --------------------------------------------------- |
| `getTheme()`     | `pref:theme`    | Read persisted theme (`light`, `dark`, or `system`) |
| `setTheme(v)`    | `pref:theme`    | Persist theme choice                                |
| `getLanguage()`  | `pref:language` | Read persisted language code                        |
| `setLanguage(v)` | `pref:language` | Persist language choice                             |

### Date formatting (`format-date.ts`)

Locale-aware date formatting using `Intl.DateTimeFormat`.

| Export                           | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `formatDate(iso, locale, style)` | Format an ISO date string. Styles: `short`, `medium`, `long`             |
| `getUserLocale()`                | Detect user locale (web: `navigator.language`, mobile: fallback `en-US`) |
| `getSupportedLocales()`          | List of supported locale tags                                            |
| `DateFormatStyle`                | Type: `'short' \| 'medium' \| 'long'`                                    |

Supported locales: es-CO, es-AR, es-MX, es-UY, fi-FI, en-US, en-AU.

**Examples:**

```typescript
formatDate('2026-03-31T00:00:00Z', 'es-CO', 'medium'); // "31 mar 2026"
formatDate('2026-03-31T00:00:00Z', 'en-US', 'medium'); // "Mar 31, 2026"
formatDate('2026-03-31T00:00:00Z', 'en-AU', 'medium'); // "31 Mar 2026"
```

## Dependencies

### Internal

None (standalone)

### External

@react-native-async-storage/async-storage, react-native

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

Each module has a co-located test file: `platform.test.ts`, `cache-storage.test.ts`, `preference-storage.test.ts`, `format-date.test.ts`.
