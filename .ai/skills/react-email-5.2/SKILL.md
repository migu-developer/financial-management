---
name: react-email-5.2
description: |
  React Email 5.2 patterns for JSX email templates with Tailwind.
  TRIGGER when: creating or editing email templates, using @react-email/components,
  or configuring the transactional email package.
metadata:
  version: '5.2.10'
  catalog_ref: 'react-email: ^5.2.10'
  scope: [packages]
  auto_invoke: 'When creating email templates or working with transactional emails'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# React Email 5.2

## Version

react-email@5.2.10 (from pnpm catalog), @react-email/components@1.0.11, @react-email/tailwind@2.0.7

## Critical Patterns

- Use JSX components from `@react-email/components` for all email elements
- Wrap email body with `<Tailwind>` from `@react-email/tailwind` for styling
- Use placeholder pattern `{{variable}}` for dynamic content replaced at send time
- Export each email as a default React component
- Use `render()` from `@react-email/components` to convert JSX to HTML string
- Support locale-based templates (en/es) for i18n
- Use `<Preview>` component for email preview text
- Use `<Container>` with max-width for consistent email width
- Use `<Section>` and `<Row>` / `<Column>` for layout (not div/flexbox)
- The Tailwind component uses tailwindcss 4.x internally with pixel-based preset

## Must NOT Do

- NEVER use `<div>`, `<span>` directly -- use `<Section>`, `<Text>`, `<Container>`
- NEVER use flexbox or grid layout -- email clients do not support them
- NEVER use `rem` or `em` units -- email clients interpret them inconsistently
- NEVER use external CSS files -- all styles must be inline or via Tailwind component
- NEVER use JavaScript in templates -- emails are static HTML
- NEVER send raw JSX -- always render to HTML string first
- NEVER use images without absolute URLs (no relative paths)
- NEVER use modern CSS features (variables, calc, container queries) in emails

## Examples

### Email template component

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface WelcomeEmailProps {
  userName: string;
  verifyUrl: string;
}

export default function WelcomeEmail({
  userName,
  verifyUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Financial Management, {userName}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white p-8">
            <Img
              src="https://cdn.example.com/logo.png"
              alt="Logo"
              width={120}
              height={40}
            />
            <Section className="mt-8">
              <Text className="text-2xl font-bold text-gray-900">
                Welcome, {userName}
              </Text>
              <Text className="mt-4 text-base text-gray-600">
                Verify your email to get started.
              </Text>
              <Button
                href={verifyUrl}
                className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white"
              >
                Verify Email
              </Button>
            </Section>
            <Hr className="my-8 border-gray-200" />
            <Text className="text-sm text-gray-400">
              Financial Management Inc.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Placeholder pattern for SES templates

```tsx
export default function ResetPasswordEmail() {
  return (
    <Html>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white p-8">
            <Text className="text-xl font-bold">Reset Your Password</Text>
            <Text>
              Hi {'{{userName}}'}, click below to reset your password.
            </Text>
            <Button
              href="{{resetUrl}}"
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Reset Password
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Rendering to HTML

```typescript
import { render } from '@react-email/components';
import WelcomeEmail from './templates/welcome';

const html = await render(
  WelcomeEmail({
    userName: 'Alice',
    verifyUrl: 'https://example.com/verify?token=abc',
  }),
);
// html is a string ready to send via SES
```

### Locale-based template structure

```
packages/transactional/
  src/
    templates/
      en/
        welcome.tsx
        reset-password.tsx
      es/
        welcome.tsx
        reset-password.tsx
    utils/
      render.ts
```

### Preview server

```bash
npx react-email dev --dir packages/transactional/src/templates
```
