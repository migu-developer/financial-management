# Amplify Hosting Flow

## Overview

The client application (Expo web export) is hosted on AWS Amplify. Amplify connects to the GitHub repository, builds the monorepo from the `client/main` app root, and deploys it as a static SPA with client-side routing. The stack imports auth and API configuration from v1/v2 stacks and injects them as build-time environment variables.

## Deployment Flow

```
GitHub (push to main)
  |
  v
Amplify (auto-build enabled for dev, manual trigger for prod)
  |
  |-- Reads amplify.yml from client/main/
  |-- Sets AMPLIFY_MONOREPO_APP_ROOT = client/main
  |-- Installs pnpm, runs build from app root
  |-- Injects v1/v2 env vars at build time
  |
  v
Static site deployed
  |-- SPA rewrite: all non-file paths -> /index.html
  |-- Custom domain: {prefix}.financial-management.migudev.com
  |-- ACM certificate auto-provisioned by Amplify
  |
  v
EventBridge rule captures build status
  |-- SUCCEED / FAILED / STARTED
  |-- -> SNS topic -> notification Lambda -> SES alert email
```

## Stack Configuration

| Setting              | Dev (us-east-1) | Prod (us-east-2)            |
| -------------------- | --------------- | --------------------------- |
| Platform             | WEB             | WEB                         |
| Stage                | DEVELOPMENT     | PRODUCTION                  |
| Auto-build on push   | Yes             | No (manual/release trigger) |
| Branch               | main            | main                        |
| App root             | `client/main`   | `client/main`               |
| Branch auto-deletion | Enabled         | Enabled                     |

## Environment Variables (injected at build)

The Amplify stack imports these from v1 (Auth, Assets) and v2 (API Gateway) stacks via CloudFormation cross-stack exports:

| Variable                    | Source         | Description                                        |
| --------------------------- | -------------- | -------------------------------------------------- |
| `AMPLIFY_MONOREPO_APP_ROOT` | Props          | `client/main` -- tells Amplify where the app lives |
| `USER_POOL_ID`              | v1 Auth        | Cognito User Pool ID                               |
| `USER_POOL_CLIENT_ID`       | v1 Auth        | Cognito app client ID                              |
| `COGNITO_DOMAIN`            | v1 Auth        | Cognito hosted UI domain                           |
| `COGNITO_REGION`            | Stack region   | AWS region for Cognito endpoints                   |
| `IDENTITY_POOL_ID`          | v1 Auth        | Cognito Identity Pool ID                           |
| `ASSETS_BUCKET_NAME`        | v1 Assets      | S3 bucket name for email templates                 |
| `ASSETS_BUCKET_URL`         | Props          | S3 bucket URL                                      |
| `APPLICATION_URL`           | Props          | App URL (custom domain)                            |
| `API_URL`                   | v2 API Gateway | REST API endpoint (custom domain or default)       |

## SPA Rewrite

Amplify is configured with a custom rewrite rule for client-side routing (Expo Router):

```
Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
Target: /index.html
Status: 200
```

This means:

- Requests for static files (`.js`, `.css`, `.png`, etc.) are served as-is
- All other paths return `index.html` with status 200 (not 301/302)
- Expo Router handles client-side navigation from there

## Custom Domain

| Setting       | Value                                                     |
| ------------- | --------------------------------------------------------- |
| Root domain   | `financial-management.migudev.com` (Route 53 hosted zone) |
| Dev subdomain | `dev.financial-management.migudev.com`                    |
| Prod domain   | `financial-management.migudev.com` (root)                 |
| Certificate   | ACM auto-provisioned by Amplify                           |
| DNS           | Amplify creates CNAME records in Route 53                 |

## GitHub Token

The GitHub access token is stored in AWS Secrets Manager. At deploy time, CloudFormation resolves it dynamically:

```
{{resolve:secretsmanager:{accessTokenName}}}
```

The token never appears in the CloudFormation template or stack outputs.

## Build Notifications

Amplify build events are captured by an EventBridge rule (configured in the v3 monitoring stack) and routed through the same notification pipeline:

```
Amplify build event -> EventBridge -> SNS topic -> notification Lambda -> SES email
```

Build status values: `SUCCEED`, `FAILED`, `STARTED`. Failed builds are classified as CRITICAL severity.

## Cross-Stack Dependencies

```
v1 Auth (Cognito) ──────────┐
v1 Assets (S3 bucket) ──────┤
v2 API Gateway ─────────────┤
                             v
                   v2 Amplify Hosting
                             │
                             v
                   v3 Monitoring (EventBridge rule)
```

## Related Code

| Component         | Path                                                  |
| ----------------- | ----------------------------------------------------- |
| Amplify CDK stack | `infra/lib/versions/v2/amplify-hosting-stack.ts`      |
| Amplify tests     | `infra/lib/versions/v2/amplify-hosting-stack.test.ts` |
| Client app        | `client/main/`                                        |
| Expo config       | `client/main/app.config.ts`                           |
| EventBridge rule  | `infra/lib/versions/v3/monitoring-stack.ts`           |
