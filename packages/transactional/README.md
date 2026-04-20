# @packages/transactional

React Email templates for the financial management project. Contains 8 transactional email templates (7 Cognito custom messages + 1 service alert) in 2 locales (English and Spanish), with shared components, a Tailwind-based design system, and a build pipeline that exports static HTML and uploads to S3.

## Responsibility

Defines all email templates used by Cognito Lambda triggers (`@packages/cognito`) and the alarm notification handler (`@packages/notifications`). Templates are built as React components using `@react-email/components`, styled with Tailwind CSS, and exported to static HTML files that are uploaded to S3 for runtime consumption.

## Exports

This package does not export a JavaScript/TypeScript API. It produces static HTML files in `dist/{locale}/{template}.html` that are consumed at runtime by other Lambda functions loading templates from S3.

## Email Templates

### Cognito Custom Message Templates (7)

| Template                    | File Name                     | Cognito Trigger                     | Purpose                                    |
| --------------------------- | ----------------------------- | ----------------------------------- | ------------------------------------------ |
| Account Verification        | `account-verification`        | `CustomMessage_SignUp`              | Verification code on signup                |
| Admin Invitation            | `admin-invitation`            | `CustomMessage_AdminCreateUser`     | Temporary password for admin-created users |
| Resend Verification Code    | `resend-verification-code`    | `CustomMessage_ResendCode`          | Resend verification code                   |
| Password Reset              | `password-reset`              | `CustomMessage_ForgotPassword`      | Password recovery code                     |
| Account Update Verification | `account-update-verification` | `CustomMessage_UpdateUserAttribute` | Verify attribute change                    |
| Attribute Verification      | `attribute-verification`      | `CustomMessage_VerifyUserAttribute` | Verify specific attribute                  |
| MFA Authentication          | `mfa-authentication`          | `CustomMessage_Authentication`      | MFA sign-in code                           |

These templates use the Cognito placeholder `{####}` for the verification code and `{username}` for the username. Cognito replaces these at send time.

### Service Alert Template (1)

| Template      | File Name       | Consumer                  | Purpose                                |
| ------------- | --------------- | ------------------------- | -------------------------------------- |
| Service Alert | `service-alert` | `@packages/notifications` | CloudWatch alarm / Amplify build alert |

This template uses `{{placeholder}}` syntax (e.g. `{{alarmName}}`, `{{severity}}`). The notification Lambda replaces these at runtime before sending via SES.

## Locales

All 8 templates are available in:

- **`en`** -- English (`emails/en/`)
- **`es`** -- Spanish (`emails/es/`)

Each locale directory also contains a `footer-copy.ts` file with localized footer text (help message, legal notice, rights, privacy link).

## Components

### `EmailLayout`

The root layout wrapper for all emails. Provides:

- `<Html>` + `<Head>` with responsive CSS
- Tailwind CSS integration via `@react-email/tailwind`
- `<EmailHeader>` -- Logo image from the assets CDN
- `<EmailFooter>` -- Localized help text, legal notice, and privacy link
- `<Preview>` -- Email preview text

**Props:** `preview` (string), `children` (ReactNode), `footer` (EmailFooterCopy)

### `VerificationCodeBlock`

A styled code display box used by all Cognito verification templates. Shows a label, a large bold code, and an optional hint (e.g. "Valid for 10 minutes").

**Props:** `label` (string), `code` (string), `hint` (string, optional)

### `ServiceAlertBlock`

A severity-colored alert card used by the service-alert template. Displays alarm name, service, timestamp, description, and a dashboard link. Styles vary by severity (red for CRITICAL, yellow for WARNING).

**Props:** `alarmName`, `severity`, `service`, `description`, `timestamp`, `dashboardUrl`, `labels` (optional localized labels)

## Build Pipeline

### 1. Development Preview

```bash
pnpm email:dev
```

Starts the React Email dev server with hot reload for previewing templates in the browser.

### 2. Export to Static HTML

```bash
pnpm email:export
```

Renders all email components to static HTML files in `dist/{locale}/{template}.html`.

### 3. Upload to S3

```bash
pnpm email:upload
```

Uploads all files from `dist/` to S3 at `{ASSETS_BUCKET_PREFIX}-{AWS_REGION}-assets/{EMAILS_PREFIX}/{locale}/{template}.html`.

**Required environment variables:** `ASSETS_BUCKET_PREFIX`, `AWS_REGION`, `EMAILS_PREFIX`

### 4. Full Build (React Email studio)

```bash
pnpm email:build
```

Builds the React Email preview app (copies `.env`, runs `email build`, then `npm run build` in `.react-email/`).

### 5. Start Built Preview

```bash
pnpm email:start
```

Starts the built React Email preview server.

## Constants

### Cognito Placeholders (`utils/constants.ts`)

```typescript
COGNITO_CODE_PLACEHOLDER = '{####}';
COGNITO_USERNAME_PLACEHOLDER = '{username}';
```

### Alert Placeholders (`utils/alert-constants.ts`)

```typescript
ALERT_ALARM_NAME = '{{alarmName}}';
ALERT_SEVERITY = '{{severity}}';
ALERT_SERVICE = '{{service}}';
ALERT_DESCRIPTION = '{{description}}';
ALERT_TIMESTAMP = '{{timestamp}}';
ALERT_DASHBOARD_URL = '{{dashboardUrl}}';
ALERT_STAGE = '{{stage}}';
```

## Structure

```
packages/transactional/
  emails/
    en/                                    # English templates
      account-verification.tsx
      admin-invitation.tsx
      resend-verification-code.tsx
      password-reset.tsx
      account-update-verification.tsx
      attribute-verification.tsx
      mfa-authentication.tsx
      service-alert.tsx
      footer-copy.ts                       # English footer text
    es/                                    # Spanish templates (same files)
      ...
      footer-copy.ts                       # Spanish footer text
  components/
    EmailLayout.tsx                         # Root layout (header, footer, Tailwind)
    VerificationCodeBlock.tsx               # Verification code display box
    ServiceAlertBlock.tsx                   # Alert severity card
  config/
    index.ts                               # Environment config loader
  utils/
    constants.ts                           # Cognito placeholder constants
    alert-constants.ts                     # Alert placeholder constants
  scripts/
    upload-emails-to-s3.ts                 # S3 upload script (CLI entry point)
    lib/
      upload-emails-s3.ts                  # Upload logic (testable, dependency-injected)
  dist/                                    # Generated static HTML (by email:export)
    en/
      account-verification.html
      admin-invitation.html
      ...
    es/
      ...
  tailwind.config.ts                       # Tailwind CSS config for email rendering
  jest.config.ts
  jest.env.ts
  jest.setup.ts
  package.json
  tsconfig.json
```

## Dependencies

### Internal (workspace)

- `@features/ui` -- Design system colors used in Tailwind config
- `@packages/config` -- ESLint configuration (devDependency)

### External (runtime)

- `@react-email/components` -- Email-safe HTML components (Body, Container, Text, Link, etc.)
- `@react-email/tailwind` -- Tailwind CSS integration for React Email
- `react`, `react-dom` -- React rendering

### External (devDependencies)

- `react-email` -- CLI for dev server, build, and export
- `@react-email/preview-server` -- Preview server for development
- `tailwindcss`, `@tailwindcss/postcss` -- Tailwind CSS engine
- `@aws-sdk/client-s3` -- S3 upload in the upload script
- `tsx` -- TypeScript script execution
- `dotenv` -- Environment variable loading
- `cross-env` -- Cross-platform env variable setting
- `ts-jest`, `jest` -- Test runner
- `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` -- React-specific linting

## Scripts

| Script         | Command                              | Description                                  |
| -------------- | ------------------------------------ | -------------------------------------------- |
| `email:dev`    | `email dev`                          | Start React Email dev server with hot reload |
| `email:build`  | `email build && ...`                 | Build the React Email preview app            |
| `email:start`  | `email start`                        | Start the built preview server               |
| `email:export` | `email export --outDir dist`         | Export all templates to static HTML          |
| `email:upload` | `tsx scripts/upload-emails-to-s3.ts` | Upload dist/ HTML files to S3                |
| `typecheck`    | `tsc --noEmit`                       | TypeScript type checking                     |
| `lint`         | `eslint .`                           | Run ESLint                                   |
| `lint:fix`     | `eslint . --fix`                     | Auto-fix ESLint issues                       |
| `test`         | `jest`                               | Run unit tests                               |

## Testing

```bash
pnpm test
```

Tests are colocated with source files (`*.test.tsx` for components and emails, `*.test.ts` for scripts and config). Test coverage includes:

- Component rendering (EmailLayout, VerificationCodeBlock)
- Email template rendering (all 8 templates in both locales)
- Footer copy content
- S3 upload script logic (dependency-injected, no real AWS calls)
- Config loading
