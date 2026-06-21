# Deployment

## Environment Variables

Environment files are stored in `config/` and loaded via `.envrc` (direnv):

| Variable                  | Description                                     | Required |
| ------------------------- | ----------------------------------------------- | -------- |
| `AWS_REGION`              | AWS region (us-east-1 or us-east-2)             | Yes      |
| `PROJECT_PREFIX`          | Stack name prefix (e.g. FinancialManagementDev) | Yes      |
| `STAGE`                   | Environment stage (dev / prod)                  | Yes      |
| `DATABASE_URL`            | PostgreSQL write connection string              | Yes      |
| `DATABASE_READONLY_URL`   | PostgreSQL read-only connection string          | Yes      |
| `ALLOWED_ORIGINS`         | CORS origins (comma-separated)                  | Yes      |
| `ALLOWED_METHODS`         | Allowed HTTP methods (comma-separated)          | No       |
| `SES_FROM_EMAIL`          | Verified SES sender email                       | Yes      |
| `ALERT_EMAIL_TO`          | Alert notification recipient                    | Yes      |
| `ALERT_EMAIL_FROM`        | Alert sender email                              | Yes      |
| `DASHBOARD_URL`           | CloudWatch dashboard URL (for alert emails)     | No       |
| `GOOGLE_CLIENT_ID`        | Google OAuth client ID                          | Yes      |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret                      | Yes      |
| `FACEBOOK_APP_ID`         | Facebook OAuth app ID                           | Yes      |
| `FACEBOOK_APP_SECRET`     | Facebook OAuth app secret                       | Yes      |
| `APPLE_CLIENT_ID`         | Apple Sign-In service ID                        | Yes      |
| `APPLE_TEAM_ID`           | Apple developer team ID                         | Yes      |
| `APPLE_KEY_ID`            | Apple Sign-In key ID                            | Yes      |
| `APPLE_PRIVATE_KEY`       | Apple Sign-In private key (PEM)                 | Yes      |
| `MICROSOFT_CLIENT_ID`     | Microsoft OIDC client ID                        | Yes      |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OIDC client secret                    | Yes      |
| `ASSETS_BUCKET_NAME`      | S3 bucket for email templates                   | Yes      |
| `EMAILS_PREFIX`           | S3 key prefix for email templates               | Yes      |
| `GITHUB_TOKEN`            | GitHub PAT for Amplify source (SSM)             | Yes      |
| `DEPLOY_VERSIONS`         | CDK stack versions to deploy (e.g. v1,v2,v3)    | No       |

> See `config/.env.development` and `config/.env.production` for per-environment values.

## CI/CD Pipelines

All CI/CD runs on GitHub Actions with OIDC authentication (no static AWS keys).

| Workflow                   | Trigger                     | Environment            |
| -------------------------- | --------------------------- | ---------------------- |
| **CI**                     | PR + push to main           | -                      |
| **Deploy Infrastructure**  | After CI passes on main     | staging (us-east-1)    |
| **Deploy Infrastructure**  | GitHub release published    | production (us-east-2) |
| **Deploy Client**          | After CI passes on main     | staging                |
| **Deploy Email Templates** | After CI passes on main     | staging                |
| **Publish API Docs**       | After infrastructure deploy | staging/production     |
| **Integration Tests**      | PR + push to main           | -                      |

The **CI** workflow runs two jobs: `quality` (lint/typecheck/format/test) and
`sfn-local` — which validates the AI chat state machine end-to-end against Step
Functions Local with a MockConfigFile (every branch, retry and catch), no deploy
required. See [AI Chat flow](ai-chat-flow.md) for the workflow architecture and
`infra/test/sfn-local/` for the mock suite.

Production deploys are triggered by creating a GitHub release (non-pre-release).

> GitHub Environments are `staging` (= dev account) and `production`. The
> `ALERT_EMAIL_TO` / `ALERT_EMAIL_FROM` values live as environment-level
> **variables** (not repo secrets) — `deploy-infra.yml` reads them as
> `vars.ALERT_EMAIL_*`.

## Manual Deployment

```bash
# 1. Select environment
echo "development" > config/.env.current && direnv allow

# 2. Deploy all CDK stacks
pnpm infra:cdk deploy --all --require-approval never

# 3. Deploy client (trigger Amplify build)
aws amplify start-job --app-id <APP_ID> --branch-name main --job-type RELEASE

# 4. Deploy email templates to S3
pnpm email:export && pnpm email:upload
```

## AWS Resources

### us-east-1 (Development)

| Service        | Resource                            | Name / Details                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lambda         | 14 functions                        | API handlers: `fm-dev-{expenses,documents,currencies,users,chat}`. Cognito triggers: `fm-dev-{custom-message,user-sync,pre-signup}`. Monitoring: `fm-dev-notifications`. Chat SFN tasks: `fm-dev-chat-{execute-query,validate-fields,create-expense,save-and-publish,save-preview}` |
| Step Functions | 1 state machine                     | `fm-dev-chat-process` (AI chat workflow, Standard)                                                                                                                                                                                                                                  |
| AppSync        | 1 Events API                        | `fm-dev-chat-events` (realtime chat delivery)                                                                                                                                                                                                                                       |
| API Gateway    | 1 REST API                          | Regional endpoint, Cognito authorizer, custom domain                                                                                                                                                                                                                                |
| Cognito        | User Pool + Identity Pool           | Google, Facebook, Apple, Microsoft IdPs                                                                                                                                                                                                                                             |
| S3             | 1 assets bucket                     | `migudev-fm-us-east-1-assets`                                                                                                                                                                                                                                                       |
| Amplify        | 1 hosting app                       | `dev.financial-management.migudev.com`                                                                                                                                                                                                                                              |
| CloudWatch     | 1 dashboard + 34 alarms + composite | API Gateway, Lambda (incl. chat), Cognito triggers, Step Functions chat workflow, AppSync Events; composite `Chat-Unhealthy`                                                                                                                                                        |
| EventBridge    | 1 rule                              | Amplify build status -> SNS                                                                                                                                                                                                                                                         |
| Route 53       | 1 hosted zone                       | `financial-management.migudev.com`                                                                                                                                                                                                                                                  |

### us-east-2 (Production)

Same resources with `fm-prod-*` naming and production domain.
