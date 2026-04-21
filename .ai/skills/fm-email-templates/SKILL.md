---
name: fm-email-templates
description: |
  Manage Cognito transactional email templates (preview, export, upload to S3).
  TRIGGER when: editing email templates, adding new templates, or uploading to S3.
metadata:
  version: '1.0'
  scope: [packages]
  auto_invoke: 'Working with email templates'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-email-templates -- Transactional Email Templates

## Version

1.0

## Overview

Email templates live in `packages/transactional/`. They are React Email components
built with `@react-email/components` and Tailwind CSS, compiled to HTML, and
uploaded to S3 for use by Cognito custom message triggers.

## Commands

### Preview in browser

```bash
pnpm email:dev
```

Opens a local dev server with live preview of all templates.

### Export to HTML

```bash
pnpm email:export
```

Compiles all templates to static HTML files in `packages/transactional/dist/`.
Output structure: `dist/{locale}/{template-name}.html` (e.g. `dist/en/account-verification.html`).

### Upload to S3

```bash
pnpm email:upload
```

Uploads `dist/{locale}/*.html` to the assets S3 bucket at `{EMAILS_PREFIX}/{locale}/{name}.html`.
Requires: `AWS_REGION`, `ASSETS_BUCKET_PREFIX`, `EMAILS_PREFIX` environment variables.
Run `pnpm email:export` first.

### Run tests

```bash
cd packages/transactional && pnpm test
```

## Template Structure

### Locales

Templates exist in two locales, mirrored identically:

- `emails/en/` -- English templates
- `emails/es/` -- Spanish templates

### Available Templates

- `account-verification` -- Sign-up email verification code
- `account-update-verification` -- Account attribute update verification
- `admin-invitation` -- Admin-sent user invitation
- `attribute-verification` -- Attribute change verification
- `mfa-authentication` -- MFA authentication code
- `password-reset` -- Password reset code
- `resend-verification-code` -- Resend verification code
- `service-alert` -- CloudWatch alarm notification

Each locale also has a `footer-copy.ts` with locale-specific footer text.

### Placeholder Pattern

Cognito replaces these placeholders at send time:

- `{####}` -- Verification code (defined as `COGNITO_CODE_PLACEHOLDER`)
- `{username}` -- Username (defined as `COGNITO_USERNAME_PLACEHOLDER`)

Constants are in `packages/transactional/utils/constants.ts`.

## Shared Components

### EmailLayout

Main wrapper component. Props: `preview` (string), `children`, `footer` (EmailFooterCopy).
Includes header with logo, responsive container, and footer with legal text.
Located at `components/EmailLayout.tsx`.

### VerificationCodeBlock

Displays a styled verification code. Props: `label`, `code`, `hint`.
Located at `components/VerificationCodeBlock.tsx`.

### ServiceAlertBlock

Displays alarm details with severity styling (CRITICAL/WARNING).
Props: `alarmName`, `severity`, `service`, `description`, `timestamp`, `dashboardUrl`.
Located at `components/ServiceAlertBlock.tsx`.

## Creating a New Template

1. Create the component in both `emails/en/{name}.tsx` and `emails/es/{name}.tsx`
2. Use `EmailLayout` as the outer wrapper
3. Use `VerificationCodeBlock` for code-based templates
4. Add `PreviewProps` for the dev server preview
5. Add tests alongside each template (`{name}.test.tsx`)
6. Run `pnpm email:dev` to preview, then `pnpm email:export` and `pnpm email:upload`

## Critical Patterns

- Always create templates in both `en/` and `es/` locales
- Always export before uploading (`pnpm email:export` then `pnpm email:upload`)
- Use the shared components (EmailLayout, VerificationCodeBlock) for consistency
- Use Cognito placeholder constants from `utils/constants.ts`

## Must NOT Do

- Upload without exporting first (stale HTML)
- Hardcode placeholder strings instead of using constants
- Create a template in only one locale
- Inline styles when Tailwind classes are available
