# Deployment

## Environments

**Production is the only deployed environment.** The former development/staging
AWS account (`376218549964`, us-east-1) was **decommissioned in July 2026** to
reduce cost — all of its stacks, buckets, log groups and the CDK bootstrap were
destroyed. Verified empty via CLI across every enabled region.

| Environment    | AWS account    | Region      | Stack prefix              | Status                        |
| -------------- | -------------- | ----------- | ------------------------- | ----------------------------- |
| **production** | `108703089452` | `us-east-2` | `FinancialManagementProd` | ✅ Active                     |
| staging (dev)  | —              | —           | —                         | ❌ Decommissioned (July 2026) |

Consequences to keep in mind:

- The CDK code is still **stage-parameterized** (`STAGE`, `PROJECT_PREFIX`), so a
  dev environment can be recreated — but it would need a fresh account plus
  `cdk bootstrap`.
- The `staging` GitHub Environment still exists (variables/secrets kept), but no
  workflow deploys to it automatically. See [CI/CD](#cicd-pipelines).
- Tooling that targets dev is currently unusable: the `fm-deploy-dev` skill and
  the Step Functions **TestState** harness (`infra/scripts/sfn-teststate.ts`,
  dev-only by design). Workflow testing runs on **Step Functions Local** instead
  (`infra/test/sfn-local/`, executed in CI).

## Environment Variables

Environment files are stored in `config/` and loaded via `.envrc` (direnv):

| Variable                  | Description                                                                                                                                                                                                                  | Required |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `AWS_REGION`              | AWS region (`us-east-2` for production)                                                                                                                                                                                      | Yes      |
| `PROJECT_PREFIX`          | Stack name prefix (e.g. `FinancialManagementProd`)                                                                                                                                                                           | Yes      |
| `STAGE`                   | Environment stage (`prod`)                                                                                                                                                                                                   | Yes      |
| `DATABASE_URL`            | PostgreSQL write connection string                                                                                                                                                                                           | Yes      |
| `DATABASE_READONLY_URL`   | PostgreSQL read-only connection string                                                                                                                                                                                       | Yes      |
| `ALLOWED_ORIGINS`         | CORS origins (comma-separated)                                                                                                                                                                                               | Yes      |
| `ALLOWED_METHODS`         | Allowed HTTP methods (comma-separated)                                                                                                                                                                                       | No       |
| `SES_FROM_EMAIL`          | Verified SES sender email                                                                                                                                                                                                    | Yes      |
| `ALERT_EMAIL_TO`          | Alert notification recipient                                                                                                                                                                                                 | Yes      |
| `ALERT_EMAIL_FROM`        | Alert sender email                                                                                                                                                                                                           | Yes      |
| `DASHBOARD_URL`           | CloudWatch dashboard URL (for alert emails)                                                                                                                                                                                  | No       |
| `GOOGLE_CLIENT_ID`        | Google OAuth client ID                                                                                                                                                                                                       | Yes      |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret                                                                                                                                                                                                   | Yes      |
| `FACEBOOK_APP_ID`         | Facebook OAuth app ID                                                                                                                                                                                                        | Yes      |
| `FACEBOOK_APP_SECRET`     | Facebook OAuth app secret                                                                                                                                                                                                    | Yes      |
| `APPLE_CLIENT_ID`         | Apple Sign-In service ID                                                                                                                                                                                                     | Yes      |
| `APPLE_TEAM_ID`           | Apple developer team ID                                                                                                                                                                                                      | Yes      |
| `APPLE_KEY_ID`            | Apple Sign-In key ID                                                                                                                                                                                                         | Yes      |
| `APPLE_PRIVATE_KEY`       | Apple Sign-In private key (PEM)                                                                                                                                                                                              | Yes      |
| `MICROSOFT_CLIENT_ID`     | Microsoft OIDC client ID                                                                                                                                                                                                     | Yes      |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OIDC client secret                                                                                                                                                                                                 | Yes      |
| `ASSETS_BUCKET_NAME`      | S3 bucket for email templates                                                                                                                                                                                                | Yes      |
| `EMAILS_PREFIX`           | S3 key prefix for email templates                                                                                                                                                                                            | Yes      |
| `ACCESS_TOKEN_NAME`       | **Name** of the Secrets Manager secret holding the GitHub PAT for the Amplify source (e.g. `github-migudev-token`) — the value is resolved at deploy time via `{{resolve:secretsmanager:...}}`, never stored in the template | Yes      |
| `DEPLOY_VERSIONS`         | CDK stack versions to deploy (e.g. `v1,v2,v3`)                                                                                                                                                                               | No       |

Domain-related variables worth calling out (they decide the public URL):

| Variable                       | Production value                               |
| ------------------------------ | ---------------------------------------------- |
| `AMPLIFY_CUSTOM_DOMAIN`        | `financial-management.migudev.com`             |
| `AMPLIFY_CUSTOM_DOMAIN_PREFIX` | _(empty)_ — empty prefix means the **apex**    |
| `API_CUSTOM_DOMAIN_PREFIX`     | `api` → `api.financial-management.migudev.com` |

> See `config/.env.production` for per-environment values.

## CI/CD Pipelines

All CI/CD runs on GitHub Actions with OIDC authentication (no static AWS keys).

| Workflow                   | Automatic trigger                                           | Manual (`workflow_dispatch`) |
| -------------------------- | ----------------------------------------------------------- | ---------------------------- |
| **CI**                     | PR + push to main                                           | —                            |
| **Integration Tests**      | PR + push to main                                           | —                            |
| **Release Drafter**        | push to main (refresh draft) + PR (autolabel)               | yes (no environment input)   |
| **Deploy Infrastructure**  | GitHub release published (non-pre-release) → **production** | `staging` or `production`    |
| **Deploy Client**          | GitHub release published → **production**                   | `staging` or `production`    |
| **Deploy Email Templates** | GitHub release published → **production**                   | `staging` or `production`    |
| **Publish API Docs**       | After the infrastructure deploy → **production**            | —                            |

**Production deploys are automatic on a published GitHub release.** The three
deploy workflows also expose a manual `workflow_dispatch` whose `environment`
input still offers **`staging` or `production`** — the input is intentionally
kept even though the staging AWS account is decommissioned, so a future dev
environment needs no workflow change. **Staging is manual-only**: the previous
"auto-deploy on every merge to main" behaviour was removed, and a job-level
guard skips the deploy when the resolved environment is `staging` unless the run
came from `workflow_dispatch`. Dispatching `staging` today would fail at the AWS
step — there is no account behind it.

The **CI** workflow runs two jobs: `quality` (lint/typecheck/format/test) and
`sfn-local` — which validates the AI chat state machine end-to-end against Step
Functions Local with a MockConfigFile (every branch, retry and catch), no deploy
required. See [AI Chat flow](ai-chat-flow.md) for the workflow architecture and
`infra/test/sfn-local/` for the mock suite.

> GitHub Environments are `staging` and `production`. The `ALERT_EMAIL_TO` /
> `ALERT_EMAIL_FROM` values live as environment-level **variables** (not repo
> secrets) — `deploy-infra.yml` reads them as `vars.ALERT_EMAIL_*`.

### Releases

Releases use **date-based tags** (`YYYY.MM.DD.N`, e.g. `2026.07.05.1`), not
semver. `release-drafter` keeps a **draft release** up to date with the
changelog of PRs merged since the last release, grouped by label:

1. Merge PRs to `main` (each PR carries a conventional label — `feat`, `fix`,
   `chore`, …; applied automatically from the branch prefix).
2. Each push to `main` refreshes the draft release.
3. To ship: open the draft, set the date tag, and publish → this fires the
   production deploy.

Because the tags are date-based, release-drafter is configured **without**
`version-resolver`/`$RESOLVED_VERSION` (its semver resolution cannot parse date
tags and produced empty "No changes" notes). The concrete tag is set at publish
time. See `.github/release-drafter.yml`.

## Manual Deployment

```bash
# 1. Load production environment variables.
#    `set -a` (allexport) is REQUIRED: the env files hold plain KEY=value lines
#    with no `export`, so a bare `source` would only create shell variables and
#    CDK (a child process) would run with them UNSET.
set -a && source config/.env.production && set +a

# 2. Authenticate (AWS SSO) — replace with your own profile / sso-session
aws sso login --sso-session <your-sso-session>
export AWS_PROFILE=<your-prod-profile>

# 3. Verify you are on the production account before deploying
aws sts get-caller-identity --query Account --output text   # -> 108703089452

# 4. Diff, then deploy
pnpm infra:cdk diff
pnpm infra:cdk deploy --all --require-approval broadening

# 5. Deploy client (trigger Amplify build)
aws amplify start-job --app-id d2rsmp0ta8dev7 --branch-name main --job-type RELEASE

# 6. Deploy email templates to S3
pnpm email:export && pnpm email:upload
```

Always use `--require-approval broadening` in production so IAM/security changes
are surfaced before they are applied. For the two-phase deploy required when a
Lambda `functionName` changes, see the `fm-deploy-prod` skill.

## AWS Resources (production, us-east-2)

Verified against the account with the AWS CLI.

### CloudFormation stacks — 14 application stacks (+ `CDKToolkit` bootstrap)

| Version | Stacks                                                                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1**  | `Assets`, `Auth`                                                                                                                                                                             |
| **v2**  | `ApiGateway`, `ApiDocs`, `AmplifyHosting`, `AppSyncEvents`, `StepFunctionsChat`, `LambdaChat`, `LambdaExpenses`, `LambdaDocuments`, `LambdaCurrencies`, `LambdaUsers`, `LambdaExchangeRates` |
| **v3**  | `Monitoring`                                                                                                                                                                                 |

Full names follow `FinancialManagement-{version}-FinancialManagementProd-{version}-{Stack}`.

### Lambda — 15 functions (+1 CDK custom-resource helper)

All on **`nodejs24.x`**, ESM bundles, X-Ray active.

| Group            | Functions                                                                                                                                                 | Memory | Timeout |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| API handlers     | `fm-prod-expenses`, `fm-prod-documents`, `fm-prod-currencies`, `fm-prod-users`, `fm-prod-chat`                                                            | 128 MB | 30s     |
| Cognito triggers | `fm-prod-custom-message`, `fm-prod-pre-signup`, `fm-prod-user-sync`                                                                                       | 128 MB | 10s     |
| Monitoring       | `fm-prod-notifications`                                                                                                                                   | 128 MB | 10s     |
| Scheduled        | `fm-prod-update-rates`                                                                                                                                    | 128 MB | 60s     |
| Chat SFN tasks   | `fm-prod-chat-execute-query`, `fm-prod-chat-validate-fields`, `fm-prod-chat-create-expense`, `fm-prod-chat-save-and-publish`, `fm-prod-chat-save-preview` | 256 MB | 30s     |

### Other services

| Service         | Resource                              | Name / Details                                                                                                                   |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| API Gateway     | 1 REST API                            | `FinancialManagementProd-v2-ApiGateway-Api` — regional, Cognito authorizer, custom domain `api.financial-management.migudev.com` |
| Step Functions  | 1 state machine                       | `fm-prod-chat-process` (AI chat workflow, **Standard**)                                                                          |
| AppSync         | 1 Events API                          | `fm-prod-chat-events` (realtime chat delivery)                                                                                   |
| Cognito         | User Pool + Identity Pool             | Pool `us-east-2_y9tmPJMRP`; IdPs: **Google, Facebook, Microsoft, SignInWithApple**                                               |
| Amplify         | 1 hosting app                         | `d2rsmp0ta8dev7` → **`financial-management.migudev.com`** (apex, ACM cert covers apex + wildcard)                                |
| S3              | 1 assets bucket                       | `migudev-fm-prod-us-east-2-assets` (email templates, API docs) — `RemovalPolicy.RETAIN`                                          |
| CloudWatch      | 1 dashboard + 34 alarms + 1 composite | API Gateway, Lambda (incl. chat), Cognito triggers, Step Functions chat workflow, AppSync Events; composite `Chat-Unhealthy`     |
| CloudWatch Logs | 18 log groups                         | Stage-aware retention (1 month dev / 3 months prod; some AWS-managed groups differ)                                              |
| EventBridge     | 2 rules                               | Amplify build status → SNS; `fm-prod-update-rates-schedule` (exchange-rate cron)                                                 |
| SNS             | 1 topic                               | Alert topic → `fm-prod-notifications` Lambda → SES email                                                                         |
| Route 53        | 1 hosted zone                         | `financial-management.migudev.com`                                                                                               |
| Bedrock         | On-demand (no provisioned capacity)   | Nova Micro/Lite + Claude Haiku via cross-region inference profile                                                                |

## Operating Cost

Real spend from Cost Explorer (single account, production only):

| Month              | Total  |
| ------------------ | ------ |
| May 2026 (partial) | $1.57  |
| June 2026          | $5.55  |
| July 2026 (MTD)    | ~$3.13 |

**Run-rate ≈ $5.5–6.5 / month.** Breakdown of the drivers:

| Service                                                            | ~$/month | Note                                                      |
| ------------------------------------------------------------------ | -------- | --------------------------------------------------------- |
| CloudWatch                                                         | ~4.00    | **35 alarms ≈ $3.90** + log ingestion — the dominant cost |
| Route 53                                                           | ~0.50    | 1 hosted zone ($0.50/zone)                                |
| Secrets Manager                                                    | ~0.40    | $0.40/secret/month                                        |
| Bedrock (Nova / Claude)                                            | ~0.20    | Token-based — **scales with chat usage**                  |
| Amplify                                                            | ~0.10    | Build minutes + hosting                                   |
| S3                                                                 | ~0.01    | Assets                                                    |
| Lambda, API GW, Step Functions, AppSync, Cognito, ACM, EventBridge | ~0       | Within free tier at current volume                        |

The cost levers, in order: **number of CloudWatch alarms** (65% of the bill),
then **Step Functions log level** (stage-aware: `ERROR` in prod) and **Bedrock
tokens**, which are the two that grow with traffic.
