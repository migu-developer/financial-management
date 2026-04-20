# @client/main

Expo-based React Native application that serves as the shell for the Financial Management product. It wires together feature packages (`@features/auth`, `@features/dashboard`, `@features/landing`, `@features/ui`) via file-based routing and provides the top-level provider tree.

## Platform support

| Platform | Output                                       |
| -------- | -------------------------------------------- |
| iOS      | Native (Expo, New Architecture enabled)      |
| Android  | Native (Expo, edge-to-edge, adaptive icon)   |
| Web      | Static export (`expo export --platform web`) |

## Expo configuration (app.config.ts)

- **Bundle ID / Package**: `com.migudev.{dev|prod}.financialmanagement.app` (switches on `APP_VARIANT`)
- **App name**: "Financial Management" (production) / "Financial Management (Development)"
- **Orientation**: Portrait
- **User interface style**: Automatic (light/dark)
- **New Architecture**: Enabled
- **Experiments**: Typed routes, React Compiler
- **Plugins**: `expo-router`, `expo-secure-store`, `expo-web-browser`, `expo-splash-screen`
- **EAS Updates**: OTA updates via `https://u.expo.dev/<projectId>`

## Navigation structure (app/)

Routes use Expo Router file-based routing with a `Stack` navigator at the root.

```
app/
  _layout.tsx                   Root layout (PreferencesProvider > AuthProvider > Stack)
  index.tsx                     Entry redirect: web -> /landing, mobile -> /auth/login
  landing.tsx                   Marketing landing page
  privacy.tsx                   Privacy policy
  terms.tsx                     Terms of service
  contact.tsx                   Contact page
  +not-found.tsx                404 fallback

  auth/
    _layout.tsx                 Auth stack layout
    index.tsx                   Auth entry
    login/index.tsx             Sign-in screen
    register/index.tsx          Sign-up screen
    register/confirm/index.tsx  Email confirmation OTP
    forgot-password/index.tsx   Forgot password
    forgot-password/confirm/    Confirm reset code + new password
    new-password/index.tsx      Force new password challenge
    mfa/index.tsx               MFA verification
    mfa/setup/index.tsx         TOTP setup (QR code)
    callback/index.tsx          OAuth redirect handler

  dashboard/
    _layout.tsx                 Dashboard layout (tabs)
    index.tsx                   Dashboard entry
    home/index.tsx              Home / overview
    expenses/index.tsx          Expense management

  providers/
    preferences-provider.tsx    Theme + language persistence
```

## Environment variables

| Variable                           | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| `APP_VARIANT`                      | `development` or unset (production). Controls bundle ID and app name. |
| `EXPO_PUBLIC_ASSETS_URL`           | Base URL for static assets (images, logos)                            |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID                                              |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID`    | AWS Cognito App Client ID                                             |
| `EXPO_PUBLIC_COGNITO_DOMAIN`       | Cognito hosted UI domain                                              |
| `EXPO_PUBLIC_API_BASE_URL`         | Backend API base URL                                                  |

## Provider hierarchy

```
PreferencesProvider          (theme + language, NativeWind color scheme)
  AuthProvider               (Cognito session, auto-refresh timer)
    Stack Navigator          (file-based routes)
```

## Dependencies

### Internal (workspace)

| Package               | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `@features/auth`      | Authentication screens and Cognito integration |
| `@features/dashboard` | Dashboard screens, expense CRUD                |
| `@features/landing`   | Marketing and legal pages                      |
| `@features/ui`        | Design system components and tokens            |
| `@packages/i18n`      | Internationalization (en/es)                   |
| `@packages/utils`     | Platform detection, preferences, cache         |
| `@packages/models`    | Shared domain models                           |
| `@packages/config`    | Shared ESLint/TS config                        |

### External (key)

expo, expo-router, nativewind, react-native-reanimated, react-native-gesture-handler, react-native-safe-area-context, react-native-screens

## Scripts

| Script      | Command                                 | Description                 |
| ----------- | --------------------------------------- | --------------------------- |
| `start`     | `expo start`                            | Start Expo dev server       |
| `dev`       | `pnpm start`                            | Alias for start             |
| `ios`       | `expo start --ios`                      | Start on iOS simulator      |
| `android`   | `expo start --android`                  | Start on Android emulator   |
| `web`       | `expo start --web`                      | Start for web               |
| `build`     | `expo export --platform web` + font fix | Production web build        |
| `lint`      | `eslint .`                              | Run ESLint                  |
| `lint:fix`  | `eslint . --fix`                        | Auto-fix lint errors        |
| `typecheck` | `tsc --noEmit`                          | Type-check without emitting |
| `test`      | `jest`                                  | Run unit tests              |

## Testing

Tests live in `client/main/tests/` and `client/main/scripts/` (for script tests). Run with:

```bash
pnpm test
```

- **Runner**: Jest v29 with ts-jest
- **Environment**: Node
- **Mocks**: Expo modules, react-native, NativeWind, AsyncStorage, and Cognito SDK are mocked in `tests/__mocks__/`
