---
name: fm-deploy-dev
description: |
  ARCHIVED — the development environment was decommissioned in July 2026 and no
  dev AWS account exists. Kept only as a reference for recreating one. For real
  deployments use fm-deploy-prod.
metadata:
  version: '2.0'
  scope: [infra]
  status: archived
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# fm-deploy-dev -- Development Deployment (ARCHIVED)

> ## ⚠️ This environment no longer exists
>
> The development/staging AWS account (`376218549964`, us-east-1) was
> **decommissioned in July 2026** for cost reasons: all 14 stacks, the assets
> bucket, retained log groups and the CDK bootstrap were destroyed (verified
> empty across every enabled region). **Production is the only environment** —
> see `docs/deployment.md`.
>
> Do **not** follow these steps as-is. To deploy, use **`fm-deploy-prod`**.
>
> To recreate a dev environment you would additionally need to: provision a new
> AWS account, run `cdk bootstrap`, recreate the Route 53 records / social-login
> app registrations, and repopulate `config/.env.development`.

## Version

2.0 (archived)

## Prerequisites

- A dev AWS account (does not currently exist — see the notice above)
- AWS CLI configured with dev account credentials
- Node.js >= 24, pnpm installed
- Environment file `config/.env.development` populated with required variables

## Required Environment Variables

Set these in `config/.env.development` before deploying:

- `STAGE` (e.g. `dev`)
- `DATABASE_URL`, `DATABASE_READONLY_URL`
- `ALLOWED_ORIGINS`
- `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM`
- `AMPLIFY_DEFAULT_BRANCH`, `AMPLIFY_REPOSITORY`, `ACCESS_TOKEN_NAME`
- `AMPLIFY_STAGE`, `AMPLIFY_CLIENT_MAIN_ROOT`
- `ASSETS_BUCKET_URL`, `APPLICATION_URL`
- `CUSTOM_DOMAIN`, `CUSTOM_DOMAIN_HOSTED_ZONE_ID`, `API_CUSTOM_DOMAIN_PREFIX` (optional)

## Steps

### 1. Load environment

```bash
# `set -a` is required: plain `source` would not export to child processes
set -a && source config/.env.development && set +a
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run tests

```bash
pnpm test
```

### 4. Synthesize CloudFormation templates

```bash
pnpm infra:cdk synth
```

This generates templates for all active versions (v1, v2, v3) defined in
`infra/lib/versions/deploy-config.ts`.

### 5. Deploy all stacks

```bash
pnpm infra:cdk deploy --all --require-approval never
```

### 6. Verify stack statuses

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName,'fm-')].{Name:StackName,Status:StackStatus}" \
  --output table
```

## Stack Deployment Order

Stacks deploy with dependencies resolved automatically by CDK:

- **v1**: Assets (S3 bucket), Auth (Cognito + triggers)
- **v2**: ApiGateway -> LambdaExpenses, LambdaDocuments, LambdaCurrencies, LambdaUsers -> ApiDocs -> AmplifyHosting
- **v3**: Monitoring (depends on v2 Lambda exports and v1 Auth exports)

## Critical Patterns

- Always `set -a && source config/.env.development && set +a` before any CDK
  command (a bare `source` does not export to child processes)
- Run `pnpm infra:cdk synth` before deploying to catch template errors early
- The monitoring stack (v3) imports cross-version outputs from v1 and v2 stacks

## Must NOT Do

- Deploy without loading environment variables first
- Skip `synth` when changing stack definitions
- Use `--force` on CloudFormation delete operations in shared environments
