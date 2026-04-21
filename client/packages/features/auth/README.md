# @features/auth

Authentication feature package implementing the full sign-in, sign-up, OAuth, MFA, and password-reset flows against AWS Cognito. Follows Domain-Driven Design with strict layer separation.

## Auth flows

| Flow                         | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| Email/password sign-in       | Standard Cognito `USER_PASSWORD_AUTH` flow                         |
| Sign-up + email confirmation | Registration with OTP-based email verification                     |
| OAuth / Social sign-in       | Google, Facebook, Apple, Microsoft via Cognito Hosted UI + PKCE    |
| OAuth callback               | Authorization code exchange with PKCE code verifier                |
| Forgot password              | Initiate reset, receive code, confirm new password                 |
| New password challenge       | Force-change when Cognito requires `NEW_PASSWORD_REQUIRED`         |
| MFA verification             | TOTP (`SOFTWARE_TOKEN_MFA`) and SMS (`SMS_MFA`) challenge response |
| MFA setup                    | Associate TOTP secret, display QR code, verify first code          |
| Session restore              | Auto-restore session from persisted Cognito tokens on app launch   |
| Token refresh                | Proactive refresh 5 minutes before access token expiry             |
| Sign-out                     | Global sign-out (revokes all sessions), falls back to local        |
| Resend confirmation          | Re-send the email verification OTP code                            |

## Screens (pages)

| Page                 | Route                   | Description                                      |
| -------------------- | ----------------------- | ------------------------------------------------ |
| `LoginPage`          | `/auth/login`           | Email/phone + password login with social buttons |
| `RegisterPage`       | `/auth/register`        | Sign-up form (email, password, phone, name)      |
| `ForgotPasswordPage` | `/auth/forgot-password` | Enter identifier to receive reset code           |
| `MfaVerifyPage`      | `/auth/mfa`             | Enter TOTP or SMS code                           |
| `MfaSetupPage`       | `/auth/mfa/setup`       | QR code display + TOTP verification              |
| `NewPasswordPage`    | `/auth/new-password`    | Force-change password form                       |

## Presentation components

### Templates

LoginTemplate, RegisterTemplate, ForgotPasswordTemplate, ConfirmSignUpTemplate, ConfirmForgotPasswordTemplate, NewPasswordTemplate, MfaVerifyTemplate, MfaSetupTemplate

### Atoms

- **OtpInput** -- 6-digit OTP code entry
- **PasswordStrength** -- Visual password strength indicator (+ `evaluatePasswordStrength` utility)
- **PhoneInput** -- International phone number input with country selector
- **QrCode** -- QR code renderer (react-native-qrcode-svg)

### Molecules

- **IdentifierInput** -- Smart input that detects email vs phone (+ `detectIdentifierType` utility)
- **TermsConsent** -- Terms and privacy consent checkbox
- **NotificationPreference** -- Notification channel preference selector

## Architecture (DDD layers)

```
src/
  domain/
    entities/           User, AuthSession (+ isSessionExpired, sessionExpiresInMs)
    value-objects/      Identifier, Password, PhoneNumber
    errors/             12 typed error classes (AuthError hierarchy)
    repositories/       AuthRepository port (interface)
    utils/              Constants (EMAIL_REGEX, IdentifierType enum)

  application/
    use-cases/          12 use cases (see below)

  infrastructure/
    cognito/            CognitoAuthRepository, CognitoStorageAdapter, CognitoConfig, PKCE utils
    phone/              LibphonenumberParser

  presentation/
    providers/          AuthProvider (React context + useAuth hook)
    hooks/              useSocialSignIn
    pages/              6 page components
    components/         Templates, atoms, molecules
```

## Domain entities

### User

```typescript
interface User {
  userId;
  givenName;
  fullname;
  email;
  phoneNumber?;
  birthdate?;
  profilePicture?;
  locale?;
  providerUserId?;
  address?;
  lastUpdateTime?;
  emailVerified;
  phoneVerified;
}
```

### AuthSession

```typescript
interface AuthSession {
  accessToken;
  idToken;
  refreshToken;
  expiresAt;
  userId;
}
```

## Use cases (12 total)

| Use case                       | Description                              |
| ------------------------------ | ---------------------------------------- |
| `SignInUseCase`                | Authenticate with identifier + password  |
| `SignUpUseCase`                | Register a new user                      |
| `ConfirmSignUpUseCase`         | Verify email with OTP code               |
| `ResendConfirmationUseCase`    | Re-send OTP code                         |
| `ForgotPasswordUseCase`        | Initiate password reset                  |
| `ConfirmForgotPasswordUseCase` | Confirm reset with code + new password   |
| `SignOutUseCase`               | Sign out (global, then local fallback)   |
| `HandleOAuthCallbackUseCase`   | Exchange OAuth code for tokens (PKCE)    |
| `InitiateSocialSignInUseCase`  | Generate OAuth URL with PKCE params      |
| `RespondToChallengeUseCase`    | Respond to MFA or new-password challenge |
| `SetupTotpUseCase`             | Associate TOTP software token            |
| `VerifyTotpSetupUseCase`       | Verify TOTP code and complete setup      |

## Infrastructure

### CognitoAuthRepository

Implements the `AuthRepository` port using `amazon-cognito-identity-js`. Handles all Cognito SDK callback-based flows, maps CognitoUserSession to domain `AuthSession`, and translates SDK error codes into typed domain exceptions.

### CognitoStorageAdapter

Bridges the synchronous `Storage` interface required by the Cognito SDK with `AsyncStorage`:

- `hydrate()` loads all Cognito keys into an in-memory `Map` at startup
- `getItem()` reads synchronously from the in-memory cache
- `setItem()`/`removeItem()` update the cache synchronously and persist to AsyncStorage asynchronously

### PKCE utilities

Generates RFC 7636 PKCE parameters using `expo-crypto`:

- `codeVerifier`: 128-char base64url random string
- `codeChallenge`: S256 hash of the verifier
- `state`: 32-char base64url random string for CSRF protection

## Social providers

| Provider  | Cognito identity_provider |
| --------- | ------------------------- |
| Google    | `Google`                  |
| Facebook  | `Facebook`                |
| Apple     | `SignInWithApple`         |
| Microsoft | `Microsoft`               |

## Dependencies

### Internal

`@features/ui`, `@packages/i18n`, `@packages/utils`

### External

amazon-cognito-identity-js, expo-crypto, expo-auth-session, expo-secure-store, expo-web-browser, expo-linking, libphonenumber-js, react-native-qrcode-svg, react-native-svg, @react-native-async-storage/async-storage

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

Every layer has co-located test files (`*.test.ts` / `*.test.tsx`). Domain entities, value objects, use cases, infrastructure adapters, presentation components, and the auth provider all have dedicated tests. Mocks for Expo modules, react-native, NativeWind, and the Cognito SDK are in `src/__mocks__/`.
