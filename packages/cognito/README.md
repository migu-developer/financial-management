# @packages/cognito

AWS Cognito Lambda trigger handlers for the financial management project. Implements custom-message, pre-signup, and user-sync triggers with support for multiple locales, S3-based email templates, and social provider linking.

## Responsibility

Handles all Cognito User Pool Lambda triggers that customize authentication flows: rendering localized email/SMS messages from S3 templates, auto-confirming social signups, linking social identities to native accounts, and synchronizing user data to the PostgreSQL database on signup and login.

## Trigger Types

The package handles 13 Cognito trigger sources across three Lambda functions:

### custom-message (7 triggers)

| Trigger Source                      | Template Name                 | Purpose                                    |
| ----------------------------------- | ----------------------------- | ------------------------------------------ |
| `CustomMessage_SignUp`              | `account-verification`        | Verification code on email signup          |
| `CustomMessage_AdminCreateUser`     | `admin-invitation`            | Temporary password for admin-created users |
| `CustomMessage_ResendCode`          | `resend-verification-code`    | Resend verification code                   |
| `CustomMessage_ForgotPassword`      | `password-reset`              | Password recovery code                     |
| `CustomMessage_UpdateUserAttribute` | `account-update-verification` | Verify attribute change                    |
| `CustomMessage_VerifyUserAttribute` | `attribute-verification`      | Verify a specific attribute                |
| `CustomMessage_Authentication`      | `mfa-authentication`          | MFA sign-in code                           |

### pre-signup (3 triggers, 1 handled)

| Trigger Source               | Handler          | Purpose                                                         |
| ---------------------------- | ---------------- | --------------------------------------------------------------- |
| `PreSignUp_ExternalProvider` | Yes              | Auto-confirms social users and links to existing native account |
| `PreSignUp_SignUp`           | No (passthrough) | --                                                              |
| `PreSignUp_AdminCreateUser`  | No (passthrough) | --                                                              |

### user-sync (3 triggers, 2 handled)

| Trigger Source                           | Handler          | Purpose                                                                                  |
| ---------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `PostConfirmation_ConfirmSignUp`         | Yes              | Creates or updates user in PostgreSQL; links existing social providers to native account |
| `PostAuthentication_Authentication`      | Yes              | Upserts user profile on every login (find by uid, migrate email, or create)              |
| `PostConfirmation_ConfirmForgotPassword` | No (passthrough) | --                                                                                       |

## Exports

This package does not export a public API. Each handler in `handlers/` serves as the Lambda entry point for its respective trigger.

## Structure

```
src/
  handlers/
    custom-message.ts           # Lambda handler (CDK entry point)
    pre-signup.ts               # Lambda handler (CDK entry point)
    user-sync.ts                # Lambda handler (CDK entry point)
  custom-message/
    types.ts                    # CustomMessageTriggerEvent, SupportedLocale, MessageContent
    templates/
      index.ts                  # resolveLocale(), getMessages()
      en.ts                     # English subject/SMS messages
      es.ts                     # Spanish subject/SMS messages
      s3.ts                     # getEmailHtmlFromS3(), getS3Key(), TRIGGER_TO_TEMPLATE
  pre-signup/
    types.ts                    # PreSignUpEvent, PreSignUpTriggerSource
    infrastructure/
      adapters/
        trigger-handlers.ts     # PreSignUp_ExternalProvider handler
  user-sync/
    types.ts                    # CognitoUserSyncEvent, UserSyncTriggerSource
    domain/
      ports/
        cognito-admin.port.ts   # CognitoAdminPort interface
        user-sync.port.ts       # UserSyncPort interface
    application/
      use-cases/
        link-provider.use-case.ts             # Links social identity to existing native user
        link-existing-providers.use-case.ts   # Links all existing social users to a new native user
        sync-user-on-signup.use-case.ts       # (referenced in tests)
        sync-user-on-login.use-case.ts        # (referenced in tests)
    infrastructure/
      adapters/
        cognito-admin.adapter.ts   # CognitoAdminPort implementation (ListUsers, AdminLink, AdminDelete)
        cognito-user.mapper.ts     # mapToCreateInput(), mapToPatchInput()
        provider-parser.ts         # parseExternalProvider() for Google, Facebook, SignInWithApple, Microsoft
        trigger-handlers.ts        # PostConfirmation_ConfirmSignUp, PostAuthentication_Authentication
```

## Social Provider Linking

The package supports four social identity providers:

- **Google** -- userName prefix `Google_`
- **Facebook** -- userName prefix `Facebook_`
- **SignInWithApple** -- userName prefix `SignInWithApple_`
- **Microsoft** -- userName prefix `Microsoft_`

**Pre-signup flow (social first):** When a social user signs up and a native user already exists with the same email, the `PreSignUp_ExternalProvider` handler auto-confirms the social user and links them to the native account via `adminLinkProviderForUser`.

**Post-confirmation flow (native first):** When a native user confirms signup and social users already exist with the same email, the `PostConfirmation_ConfirmSignUp` handler deletes the existing social Cognito users and re-links their identities under the native user. This is required because `adminLinkProviderForUser` only works on users that have not been signed up yet.

## S3 Template Loading

Email HTML bodies are loaded from S3 at runtime. The bucket and prefix are configured via environment variables:

- `ASSETS_BUCKET_NAME` -- S3 bucket name
- `EMAILS_PREFIX` -- Key prefix (e.g. `cognito/emails`)

The S3 key is constructed as: `{EMAILS_PREFIX}/{locale}/{templateName}.html`

Templates are produced by the `@packages/transactional` package and uploaded with `pnpm email:export && pnpm email:upload`.

## Environment Variables

| Variable             | Used By        | Description                               |
| -------------------- | -------------- | ----------------------------------------- |
| `ASSETS_BUCKET_NAME` | custom-message | S3 bucket containing email HTML templates |
| `EMAILS_PREFIX`      | custom-message | S3 key prefix for email templates         |

The `user-sync` handler also requires database connectivity via `@services/shared` (PostgresDatabaseService) and `@services/users` (PostgresUserRepository).

## Dependencies

### Internal (workspace)

- `@packages/models` -- `CreateUserInput`, `PatchUserInput`, `UserProfile` types
- `@services/shared` -- `PostgresDatabaseService`
- `@services/users` -- `PostgresUserRepository`
- `@packages/config` -- ESLint configuration (devDependency)

### External

- `@aws-lambda-powertools/logger` -- Structured logging
- `@aws-lambda-powertools/tracer` -- X-Ray tracing
- `@aws-sdk/client-cognito-identity-provider` -- Cognito admin API (ListUsers, AdminLink, AdminDelete)
- `@aws-sdk/client-s3` -- S3 template fetching

## Scripts

| Script      | Command          | Description              |
| ----------- | ---------------- | ------------------------ |
| `typecheck` | `tsc --noEmit`   | TypeScript type checking |
| `lint`      | `eslint .`       | Run ESLint               |
| `lint:fix`  | `eslint . --fix` | Auto-fix ESLint issues   |
| `test`      | `jest`           | Run unit tests           |

## Testing

```bash
pnpm test
```

Tests are located alongside source files (`*.test.ts`). The test suite uses `ts-jest` with module path aliases (`@custom-message/*`, `@user-sync/*`, `@pre-signup/*`). All AWS SDK clients and database ports are mocked.
