
# Authentication and Registration Flow

![Authentication and Registration Flow](https://github.com/user-attachments/assets/a1a8a3d9-d95c-4c76-9d6a-9b711684fb93)

## Overview

Authentication uses AWS Cognito User Pool with 4 social identity providers (Google, Facebook, Apple, Microsoft) and email/password registration. Three Lambda triggers handle the signup lifecycle: **pre-signup** (provider linking), **custom-message** (email templates from S3), and **user-sync** (database synchronization).

## Email/Password Registration

```
Client                  Cognito              pre-signup          custom-message         S3 Bucket
  |                        |                     |                     |                    |
  |-- SignUp(email, pw) -->|                     |                     |                    |
  |                        |-- PreSignUp ------->|                     |                    |
  |                        |   (no-op for email) |                     |                    |
  |                        |<--------------------|                     |                    |
  |                        |-- CustomMessage ---------------------------->|                 |
  |                        |                     |                     |-- GetObject ------>|
  |                        |                     |                     |<-- HTML template --|
  |                        |                     |                     |   (locale-based)   |
  |                        |<------------------------------------------------------|       |
  |<-- Verification code --|  (email via SES with HTML template)       |                    |
  |                        |                                           |                    |
  |-- ConfirmSignUp ------>|                                           |                    |
  |                        |-- PostConfirmation --> user-sync                               |
  |                        |                        |-- CreateUser(uid, email) --> Supabase |
  |                        |<-----------------------|                                      |
  |<-- Success ------------|                                                               |
```

### Step-by-step

1. Client calls `signUp()` with email, password, and locale
2. Cognito triggers **pre-signup** -- for email signup, no action needed (returns event unchanged)
3. Cognito triggers **custom-message** (`CustomMessage_SignUp`):
   - Resolves locale from `userAttributes.locale` (defaults to `en`)
   - Maps trigger to template: `CustomMessage_SignUp` -> `account-verification`
   - Fetches HTML from S3: `{EMAILS_PREFIX}/{locale}/account-verification.html`
   - Sets `emailSubject`, `emailMessage` (HTML), and `smsMessage` on the response
4. Cognito sends verification code via SES (using the HTML template)
5. Client confirms with `confirmSignUp(code)`
6. Cognito triggers **user-sync** (`PostConfirmation_ConfirmSignUp`):
   - Creates user profile in PostgreSQL via `PostgresUserRepository`
   - Stores: uid, email, first_name, last_name, locale, provider_id

## Social Provider Registration

```
Client                  Cognito              pre-signup                user-sync
  |                        |                     |                        |
  |-- OAuth redirect ----->|                     |                        |
  |   (Google/FB/Apple/MS) |                     |                        |
  |                        |-- PreSignUp_ExternalProvider -->|            |
  |                        |                     |                        |
  |                        |   If email matches existing user:            |
  |                        |   - Links provider to existing account       |
  |                        |   - Sets autoConfirmUser = true              |
  |                        |   - Sets autoVerifyEmail = true              |
  |                        |                     |                        |
  |                        |   If new email:                              |
  |                        |   - Auto-confirms (social = trusted)         |
  |                        |                     |                        |
  |                        |<--------------------|                        |
  |                        |-- PostConfirmation ----------------------->|  |
  |                        |                     |  Creates/updates user  |
  |                        |<------------------------------------------------|
  |<-- JWT tokens ---------|                                              |
```

### Provider linking logic (pre-signup)

When a social provider signup arrives, the pre-signup trigger:

1. Checks if a user with the same email already exists in the User Pool
2. If yes: links the external provider to the existing account using `AdminLinkProviderForUser`
3. If no: auto-confirms the user (social providers are trusted)
4. Sets `event.response.autoConfirmUser = true` and `event.response.autoVerifyEmail = true`

### Supported providers

| Provider  | IdP Type | Scopes                            |
| --------- | -------- | --------------------------------- |
| Google    | OIDC     | openid, email, profile            |
| Facebook  | Social   | public_profile, email             |
| Apple     | Social   | name, email                       |
| Microsoft | OIDC     | openid, email, profile, User.Read |

## MFA (Multi-Factor Authentication)

Cognito is configured with **required MFA** using two factors:

- **SMS** (with SNS spend limit and country blocking)
- **TOTP** (preferred, via authenticator app)

After first login, the user is challenged to set up TOTP. The client uses `amazon-cognito-identity-js` to handle the MFA setup flow, generating a QR code that the user scans with their authenticator app.

## Custom Message Templates

The custom-message Lambda handles 7 trigger types, each mapped to a React Email template:

| Trigger Source                      | Template                      | Description                   |
| ----------------------------------- | ----------------------------- | ----------------------------- |
| `CustomMessage_SignUp`              | `account-verification`        | Email verification on signup  |
| `CustomMessage_ForgotPassword`      | `password-reset`              | Password reset code           |
| `CustomMessage_ResendCode`          | `resend-verification-code`    | Re-send verification          |
| `CustomMessage_VerifyUserAttribute` | `attribute-verification`      | Verify changed attribute      |
| `CustomMessage_AdminCreateUser`     | `admin-invitation`            | Admin-created user invite     |
| `CustomMessage_UpdateUserAttribute` | `account-update-verification` | Attribute update verification |
| `CustomMessage_Authentication`      | `mfa-authentication`          | MFA code delivery             |

### Template loading

1. Lambda resolves locale from `userAttributes.locale` (supports `en` and `es`)
2. Maps trigger source to template name via `TRIGGER_TO_TEMPLATE`
3. Fetches HTML from S3: `s3://{ASSETS_BUCKET_NAME}/{EMAILS_PREFIX}/{locale}/{template}.html`
4. HTML templates are built with React Email (`@packages/transactional`) and uploaded via `pnpm email:export && pnpm email:upload`
5. Templates contain `{####}` placeholder which Cognito replaces with the actual verification code

## Error Scenarios

| Scenario                        | Handling                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------- |
| S3 template not found           | Lambda throws error, Cognito falls back to default email                     |
| Provider linking fails          | Pre-signup throws, signup is rejected                                        |
| Database insert fails           | User-sync throws, user exists in Cognito but not in DB (requires manual fix) |
| Duplicate email (same provider) | Cognito rejects with `UsernameExistsException`                               |
| MFA setup timeout               | Client retries, session remains valid                                        |

## Related Code

| Component              | Path                                     |
| ---------------------- | ---------------------------------------- |
| Pre-signup trigger     | `packages/cognito/src/pre-signup/`       |
| User-sync trigger      | `packages/cognito/src/user-sync/`        |
| Custom-message trigger | `packages/cognito/src/custom-message/`   |
| Email templates        | `packages/transactional/emails/{en,es}/` |
| Cognito CDK stack      | `infra/lib/versions/v1/cognito-stack.ts` |
| Client auth feature    | `client/packages/features/auth/src/`     |
