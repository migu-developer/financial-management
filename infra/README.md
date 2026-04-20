# Infrastructure (AWS CDK) -- Financial Management

AWS CDK infrastructure-as-code for the Financial Management platform. Stacks are organized into **versioned groups** (v1, v2, v3) that are deployed incrementally, with cross-version references resolved through CloudFormation exports/imports.

All stacks extend `BaseStack`, which applies a standardized naming convention (`FinancialManagement-{version}-{stackName}`), common tags (`Version`, `Project`, `ManagedBy`), and optional cross-version dependency resolution.

---

## Table of Contents

1. [Stack Versions](#stack-versions)
2. [V1 Stacks -- Foundation](#v1-stacks----foundation)
3. [V2 Stacks -- Application](#v2-stacks----application)
4. [V3 Stacks -- Observability](#v3-stacks----observability)
5. [Cross-Stack Dependencies](#cross-stack-dependencies)
6. [Environment Variables](#environment-variables)
7. [Deploy Commands](#deploy-commands)
8. [Lambda Functions](#lambda-functions)
9. [Project Structure](#project-structure)

---

## Stack Versions

The infrastructure uses a versioning strategy defined in `lib/versions/deploy-config.ts`. Each version groups related stacks by deployment tier:

| Version | Layer         | Purpose                                                               | Stacks                                                                                              |
| ------- | ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **v1**  | Foundation    | Identity and storage resources that other layers depend on            | AssetsBucket, Cognito                                                                               |
| **v2**  | Application   | API Gateway, Lambda services, documentation, and frontend hosting     | ApiGateway, LambdaExpenses, LambdaDocuments, LambdaCurrencies, LambdaUsers, ApiDocs, AmplifyHosting |
| **v3**  | Observability | Monitoring, alerting, and dashboards that observe v1 and v2 resources | Monitoring                                                                                          |

Versions are deployed in order: **v1 first, then v2, then v3**. Each higher version imports CloudFormation outputs from the versions below it. The `DEPLOY_VERSIONS` array in `lib/versions/deploy-config.ts` controls which versions are synthesized and deployed. The current default is `['v1', 'v2', 'v3']`.

The entry point (`bin/infra.ts`) iterates over configured versions, instantiates their stack factories, and then calls `BaseStack.resolveDependencies()` to wire up cross-version CDK dependency ordering.

---

## V1 Stacks -- Foundation

### AssetsBucketStack

S3 bucket for project assets (images, transactional email HTML templates, etc.).

| Property           | Value                                       |
| ------------------ | ------------------------------------------- |
| **Bucket name**    | `{ASSETS_BUCKET_PREFIX}-{region}-assets`    |
| **Public access**  | Blocked (BlockPublicAccess.BLOCK_ALL)       |
| **Encryption**     | S3-managed (SSE-S3)                         |
| **SSL**            | Enforced (enforceSSL: true)                 |
| **Versioning**     | Enabled                                     |
| **Removal policy** | RETAIN (bucket preserved on stack deletion) |

**Lifecycle rules** (noncurrent versions only):

| Transition                                     | After    |
| ---------------------------------------------- | -------- |
| STANDARD to INFREQUENT_ACCESS                  | 30 days  |
| INFREQUENT_ACCESS to GLACIER_INSTANT_RETRIEVAL | 90 days  |
| Expiration of noncurrent versions              | 365 days |

**Cross-version exports:** `AssetsBucketName`, `AssetsBucketArn` (consumed by CognitoStack, AmplifyHostingStack, MonitoringStack).

### CognitoStack

Cognito User Pool with social identity providers, MFA, Lambda triggers, SMS protection, and SES email integration.

**User Pool configuration:**

- Self sign-up enabled
- Sign-in aliases: email, phone
- Auto-verify: email, phone
- MFA: **required** (SMS + TOTP)
- Account recovery: email and phone without MFA
- Removal policy: configurable via `COGNITO_REMOVAL_PROTECT` (RETAIN or DESTROY)

**Identity Providers (4):**

| Provider      | Type                                | Scopes                 |
| ------------- | ----------------------------------- | ---------------------- |
| **Google**    | UserPoolIdentityProviderGoogle      | openid, email, profile |
| **Facebook**  | UserPoolIdentityProviderFacebook    | public_profile, email  |
| **Apple**     | UserPoolIdentityProviderApple       | name, email            |
| **Microsoft** | UserPoolIdentityProviderOidc (OIDC) | openid, email, profile |

All providers map email, given name, and family name. Google additionally maps profile picture.

**User Pool Client:**

- OAuth flow: Authorization Code Grant
- Scopes: OPENID, EMAIL, PROFILE, PHONE, COGNITO_ADMIN
- Supported IdPs: Cognito (native), Google, Facebook, Apple, Microsoft
- Auth flows: USER_SRP_AUTH

**Lambda Triggers (3):**

| Trigger                                              | Function Name               | Purpose                                                                         | Runtime      | Timeout | Tracing |
| ---------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- | ------------ | ------- | ------- |
| **PreSignUp**                                        | `fm-{stage}-pre-signup`     | Links social providers to existing native accounts before signup                | Node.js 22.x | 10s     | Active  |
| **CustomMessage**                                    | `fm-{stage}-custom-message` | Multi-language email/SMS message customization using HTML templates from S3     | Node.js 22.x | 10s     | Active  |
| **UserSync** (PostConfirmation + PostAuthentication) | `fm-{stage}-user-sync`      | Syncs Cognito users to the application database; handles social account linking | Node.js 22.x | 10s     | Active  |

**SMS Protection:**

- Monthly spend limit configured via Pinpoint SMS Voice V2
- SMS delivery logging to CloudWatch Logs (`/aws/sns/sms/{version}`)
- Country-level SMS blocking via Protect Configuration (countries defined by `SMS_BLOCKED_COUNTRIES`)

**Email:** SES integration with configurable from address, reply-to address, and region.

**Identity Pool:** CfnIdentityPool (L1), unauthenticated identities disabled.

**Cross-version exports:** `UserPoolId`, `UserPoolClientId`, `IdentityPoolId`, `UserPoolArn`, `CognitoDomain`, `PreSignUpFnName`, `CustomMessageFnName`, `UserSyncFnName`.

---

## V2 Stacks -- Application

### ApiGatewayStack

Shared REST API Gateway with Cognito authorization, request validation, rate limiting, and optional custom domain with TLS.

**API configuration:**

| Property          | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Endpoint type** | REGIONAL                                                                              |
| **Tracing**       | Enabled (X-Ray)                                                                       |
| **CORS**          | Configurable allowed origins, all standard methods, credentials allowed, max-age 300s |

**Global throttling:**

| Setting     | Value              |
| ----------- | ------------------ |
| Rate limit  | 50 requests/second |
| Burst limit | 100 requests       |

**Per-route throttling:**

| Route                      | Rate | Burst |
| -------------------------- | ---- | ----- |
| `GET /expenses`            | 30/s | 50    |
| `POST /expenses`           | 10/s | 20    |
| `PUT /expenses/{id}`       | 10/s | 20    |
| `PATCH /expenses/{id}`     | 10/s | 20    |
| `DELETE /expenses/{id}`    | 5/s  | 10    |
| `GET /expenses/types`      | 20/s | 40    |
| `GET /expenses/categories` | 20/s | 40    |
| `GET /currencies`          | 20/s | 40    |
| `GET /documents`           | 15/s | 30    |
| `GET /users`               | 10/s | 20    |
| `PATCH /users/{id}`        | 10/s | 20    |

**Cognito Authorizer:** Imports `UserPoolArn` from v1 and creates a `CognitoUserPoolsAuthorizer`. All service routes require Cognito authentication.

**Request Validators:** Three validators are created for flexible route configuration:

- Body-only validator
- Parameters-only validator
- Body + Parameters validator

**Custom Domain (optional):**

When `CUSTOM_DOMAIN` and `CUSTOM_DOMAIN_HOSTED_ZONE_ID` are set:

- Creates a wildcard ACM certificate (`*.{CUSTOM_DOMAIN}`) with DNS validation via Route 53
- Creates a `DomainName` with TLS 1.2 security policy
- Creates an A record alias in Route 53
- Base path mapping to the deployment stage

**Custom Error Responses:** Gateway responses for BAD_REQUEST_BODY, BAD_REQUEST_PARAMETERS, UNAUTHORIZED, and ACCESS_DENIED with JSON templates and CORS headers.

**Cross-version exports:** `ApiName`.

### LambdaExpensesStack

Lambda function and API routes for the expenses service.

**Endpoints (8):**

| Method   | Path                   | Validation                                 |
| -------- | ---------------------- | ------------------------------------------ |
| `GET`    | `/expenses`            | Auth + params                              |
| `POST`   | `/expenses`            | Auth + body (CreateExpense model)          |
| `GET`    | `/expenses/{id}`       | Auth + params                              |
| `PUT`    | `/expenses/{id}`       | Auth + body + params (UpdateExpense model) |
| `PATCH`  | `/expenses/{id}`       | Auth + body + params (PatchExpense model)  |
| `DELETE` | `/expenses/{id}`       | Auth + params                              |
| `GET`    | `/expenses/types`      | Auth + params                              |
| `GET`    | `/expenses/categories` | Auth + params                              |

**Models:** CreateExpense, UpdateExpense, PatchExpense (JSON Schema validation at API Gateway level).

**Cross-version exports:** `FunctionName` (namespace: LambdaExpenses).

### LambdaDocumentsStack

Lambda function and API route for the documents service.

**Endpoints (1):**

| Method | Path         | Validation    |
| ------ | ------------ | ------------- |
| `GET`  | `/documents` | Auth + params |

**Cross-version exports:** `FunctionName` (namespace: LambdaDocuments).

### LambdaCurrenciesStack

Lambda function and API route for the currencies service.

**Endpoints (1):**

| Method | Path          | Validation    |
| ------ | ------------- | ------------- |
| `GET`  | `/currencies` | Auth + params |

**Cross-version exports:** `FunctionName` (namespace: LambdaCurrencies).

### LambdaUsersStack

Lambda function and API routes for the users service.

**Endpoints (3):**

| Method  | Path          | Validation                             |
| ------- | ------------- | -------------------------------------- |
| `POST`  | `/users`      | Auth + body (CreateUser model)         |
| `GET`   | `/users/{id}` | Auth + params                          |
| `PATCH` | `/users/{id}` | Auth + body + params (PatchUser model) |

**Models:** CreateUser, PatchUser (JSON Schema validation at API Gateway level).

**Cross-version exports:** `FunctionName` (namespace: LambdaUsers).

### ApiDocsStack

OpenAPI documentation parts attached to the shared API Gateway. Documents all routes for expenses, users, currencies, and documents resources with descriptions, request bodies, query parameters, and response schemas. Creates an API documentation version (`1.0.0`).

### AmplifyHostingStack

Amplify Hosting for the Expo web client application.

**Configuration:**

| Property                 | Value                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| **Platform**             | WEB                                                                         |
| **Repository**           | GitHub (via `AMPLIFY_REPOSITORY`)                                           |
| **Access token**         | Resolved from Secrets Manager at deploy time                                |
| **Branch auto-deletion** | Enabled                                                                     |
| **Auto build**           | Configurable per stage (`AMPLIFY_ENABLE_AUTO_BUILD`)                        |
| **App root**             | Monorepo path (`AMPLIFY_CLIENT_MAIN_ROOT`, e.g. `client/main`)              |
| **SPA rewrite**          | Non-file requests serve `index.html` (React Native Web client-side routing) |

**Imports from v1:** UserPoolId, UserPoolClientId, IdentityPoolId, CognitoDomain, AssetsBucketName. All injected as Amplify environment variables for the frontend build.

**Imports from v2:** API URL from ApiGatewayStack (prefers custom domain URL when available).

**Custom domain (optional):** When `AMPLIFY_CUSTOM_DOMAIN` is set, creates a CfnDomain with auto-managed ACM certificate and DNS records.

**Cross-version exports:** `AppId` (namespace: AmplifyHosting).

---

## V3 Stacks -- Observability

### MonitoringStack

CloudWatch dashboard, alarms, SNS notifications, and EventBridge rules for full-stack observability.

**SNS Topic:** `Financial Management Alerts` -- receives alarm state changes and EventBridge events.

**Notification Lambda:**

| Property          | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Function name** | `fm-{stage}-notifications`                                             |
| **Runtime**       | Node.js 22.x                                                           |
| **Timeout**       | 10s                                                                    |
| **Tracing**       | Active (X-Ray)                                                         |
| **Purpose**       | Sends formatted alert emails via SES when alarms trigger               |
| **Permissions**   | `ses:SendEmail`, `s3:GetObject` (on assets bucket for email templates) |

Subscribed to the SNS alert topic via `LambdaSubscription`.

**Alarms (14 total):**

| Alarm                        | Metric                    | Threshold | Eval Periods | Datapoints |
| ---------------------------- | ------------------------- | --------- | ------------ | ---------- |
| Api-5xx-Errors               | ApiGateway 5XXError       | > 5       | 3            | 2          |
| Api-4xx-Spike                | ApiGateway 4XXError       | > 50      | 5            | 3          |
| Api-Latency-High             | ApiGateway Latency p99    | > 5000ms  | 5            | 3          |
| Lambda-Expenses-Errors       | Lambda Errors             | > 3       | 3            | 2          |
| Lambda-Expenses-Throttles    | Lambda Throttles          | > 0       | 1            | 1          |
| Lambda-Documents-Errors      | Lambda Errors             | > 3       | 3            | 2          |
| Lambda-Documents-Throttles   | Lambda Throttles          | > 0       | 1            | 1          |
| Lambda-Currencies-Errors     | Lambda Errors             | > 3       | 3            | 2          |
| Lambda-Currencies-Throttles  | Lambda Throttles          | > 0       | 1            | 1          |
| Lambda-Users-Errors          | Lambda Errors             | > 3       | 3            | 2          |
| Lambda-Users-Throttles       | Lambda Throttles          | > 0       | 1            | 1          |
| Cognito-PreSignUp-Errors     | Lambda Errors (5m period) | > 1       | 3            | 2          |
| Cognito-CustomMessage-Errors | Lambda Errors (5m period) | > 1       | 3            | 2          |
| Cognito-UserSync-Errors      | Lambda Errors (5m period) | > 1       | 3            | 2          |

All alarms use `TreatMissingData.NOT_BREACHING` and trigger the SNS alert topic.

**CloudWatch Dashboard sections:**

1. **API Gateway** -- Requests, Errors (4xx/5xx), Latency (p50/p90/p99)
2. **Lambda Services** -- Invocations, Errors, Duration (p90), Throttles, Concurrent Executions (for all 4 service Lambdas)
3. **Cognito Triggers** -- Invocations, Errors, Duration (for PreSignUp, CustomMessage, UserSync; 5-minute period)
4. **Cognito Trigger Errors (Logs Insights)** -- LogQueryWidget querying `/aws/lambda/{fnName}` log groups for recent ERROR entries
5. **Amplify Hosting** -- Requests, Errors (4xx/5xx), Latency (p50/p90)
6. **Alarm Status** -- AlarmStatusWidget showing all 14 alarms

**EventBridge Rule:** Captures Amplify Deployment Status Change events (STARTED, FAILED, SUCCEED) for the monitored app and forwards them to the SNS alert topic.

**Imports from v1:** AssetsBucketName, PreSignUpFnName, CustomMessageFnName, UserSyncFnName.
**Imports from v2:** ApiName, AppId (Amplify), FunctionName (Expenses, Documents, Currencies, Users).

---

## Cross-Stack Dependencies

### Same-version dependencies

Stacks within the same version use the `deps.getStack(shortName)` pattern. The **registration order** in each `lib/versions/vX/index.ts` defines the instantiation order -- a stack must be registered after the stacks it depends on.

Example: in v2, all Lambda stacks and ApiDocsStack depend on `ApiGateway`, and `AmplifyHosting` depends on `ApiGateway`. They are registered after `ApiGateway` in `v2/index.ts`.

### Cross-version dependencies

Stacks export values using `exportForCrossVersion(scope, key, value, version, stackShortName)`, which creates a `CfnOutput` with export name `FinancialManagement-{version}-{stackShortName}-{key}`.

Consumer stacks in higher versions import these values using `importFromVersion(scope, fromVersion, stackShortName, key)`, which resolves to `Fn.importValue(...)`.

**Cross-version dependency map:**

```
v1:Assets   --exports-->  AssetsBucketName, AssetsBucketArn
                          |
                          +--> v1:Auth (reads bucket at construct time)
                          +--> v2:AmplifyHosting (env var)
                          +--> v3:Monitoring (S3 permissions for notification Lambda)

v1:Auth     --exports-->  UserPoolId, UserPoolClientId, IdentityPoolId,
                          UserPoolArn, CognitoDomain,
                          PreSignUpFnName, CustomMessageFnName, UserSyncFnName
                          |
                          +--> v2:ApiGateway (Cognito authorizer)
                          +--> v2:AmplifyHosting (env vars)
                          +--> v3:Monitoring (Cognito trigger alarms)

v2:ApiGateway --exports-->  ApiName
                            +--> v3:Monitoring (API Gateway alarms + dashboard)

v2:Lambda*  --exports-->  FunctionName (per service)
                          +--> v3:Monitoring (Lambda alarms + dashboard)

v2:AmplifyHosting --exports-->  AppId
                                +--> v3:Monitoring (Amplify dashboard + EventBridge rule)
```

### Deploy-time dependency ordering

The v3 MonitoringStack declares `dependsOn` referencing v2 stacks (ApiGateway, all Lambdas, AmplifyHosting). This is resolved by `BaseStack.resolveDependencies()` after all stacks are instantiated, ensuring correct CloudFormation deploy ordering.

---

## Environment Variables

All environment variables are read at synth time from `process.env` in the stack factory files (`lib/versions/vX/index.ts`).

### General

| Variable         | Used by      | Description                                                                          |
| ---------------- | ------------ | ------------------------------------------------------------------------------------ |
| `PROJECT_PREFIX` | entry-config | Prefix for full stack resource names                                                 |
| `STAGE`          | v1, v2, v3   | Stage name (e.g. `dev`, `prod`). Used in Lambda function names and API Gateway stage |

### V1 -- Assets

| Variable               | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `ASSETS_BUCKET_PREFIX` | Bucket name prefix (e.g. `migudev-fm`). Full name: `{prefix}-{region}-assets` |

### V1 -- Cognito / Auth

| Variable                  | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID`        | Google OAuth client ID                              |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret                          |
| `FACEBOOK_APP_ID`         | Facebook app ID                                     |
| `FACEBOOK_APP_SECRET`     | Facebook app secret                                 |
| `APPLE_CLIENT_ID`         | Apple Services ID                                   |
| `APPLE_TEAM_ID`           | Apple Team ID                                       |
| `APPLE_KEY_ID`            | Apple Key ID (matches the .p8 file)                 |
| `APPLE_PRIVATE_KEY`       | Apple .p8 private key (PEM, literal `\n` accepted)  |
| `MICROSOFT_CLIENT_ID`     | Microsoft (Azure AD) app client ID                  |
| `MICROSOFT_CLIENT_SECRET` | Microsoft app client secret                         |
| `MICROSOFT_TENANT_ID`     | Azure AD tenant ID                                  |
| `COGNITO_DOMAIN_PREFIX`   | Cognito hosted UI domain prefix                     |
| `COGNITO_CALLBACK_URLS`   | Comma-separated OAuth callback URLs                 |
| `COGNITO_LOGOUT_URLS`     | Comma-separated OAuth logout URLs                   |
| `SES_FROM_EMAIL`          | SES verified sender email                           |
| `SES_REPLY_TO`            | SES reply-to email                                  |
| `AWS_REGION`              | AWS region (also used as SNS region)                |
| `SNS_MONTHLY_SPEND_LIMIT` | SNS SMS monthly spend limit (integer)               |
| `SMS_BLOCKED_COUNTRIES`   | Comma-separated ISO country codes to block for SMS  |
| `COGNITO_REMOVAL_PROTECT` | `true` for RETAIN removal policy, otherwise DESTROY |
| `EMAILS_PREFIX`           | S3 prefix for email HTML templates                  |
| `DATABASE_URL`            | Database connection string (for user-sync trigger)  |
| `DATABASE_READONLY_URL`   | Read-only database connection string                |

### V2 -- API Gateway

| Variable                       | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`              | Comma-separated CORS allowed origins                                       |
| `CUSTOM_DOMAIN`                | Route 53 hosted zone root domain (e.g. `financial-management.migudev.com`) |
| `CUSTOM_DOMAIN_HOSTED_ZONE_ID` | Route 53 hosted zone ID (required when `CUSTOM_DOMAIN` is set)             |
| `API_CUSTOM_DOMAIN_PREFIX`     | API subdomain prefix (e.g. `dev-api`)                                      |

### V2 -- Lambda Services

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `DATABASE_URL`          | Database connection string           |
| `DATABASE_READONLY_URL` | Read-only database connection string |
| `ALLOWED_ORIGINS`       | Comma-separated CORS allowed origins |

### V2 -- Amplify Hosting

| Variable                       | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `AMPLIFY_DEFAULT_BRANCH`       | Default Git branch (e.g. `main`)                     |
| `AMPLIFY_STAGE`                | Amplify stage: `PRODUCTION` or `DEVELOPMENT`         |
| `AMPLIFY_REPOSITORY`           | GitHub repository URL                                |
| `ACCESS_TOKEN_NAME`            | Secrets Manager secret name for GitHub access token  |
| `AMPLIFY_ENABLE_AUTO_BUILD`    | `true` to auto-build on push                         |
| `AMPLIFY_CLIENT_MAIN_ROOT`     | Monorepo app root path (e.g. `client/main`)          |
| `ASSETS_BUCKET_URL`            | Assets bucket URL (for frontend env)                 |
| `APPLICATION_URL`              | Application URL (for frontend env)                   |
| `AMPLIFY_CUSTOM_DOMAIN`        | Custom domain for Amplify (Route 53 zone)            |
| `AMPLIFY_CUSTOM_DOMAIN_PREFIX` | Subdomain prefix (e.g. `dev`). Empty string for root |

### V3 -- Monitoring

| Variable           | Description                                       |
| ------------------ | ------------------------------------------------- |
| `ALERT_EMAIL_TO`   | Email address to receive alarm notifications      |
| `ALERT_EMAIL_FROM` | SES-verified sender email for alarm notifications |
| `EMAILS_PREFIX`    | S3 prefix for email templates (default: `emails`) |

---

## Deploy Commands

```bash
# Build the project
pnpm build

# Bootstrap the AWS account/region (first time only)
pnpm cdk bootstrap

# Synthesize all versions configured in deploy-config.ts
pnpm cdk synth

# Show diff between deployed and current
pnpm cdk diff

# Deploy all stacks (all configured versions)
pnpm cdk deploy --all

# Deploy specific stacks by short name
pnpm cdk deploy --context stacks=Assets,Auth
pnpm cdk deploy --context stacks=ApiGateway,LambdaExpenses

# List all stacks
pnpm cdk list

# Synthesize specific stacks only
pnpm cdk synth --context stacks=Monitoring
```

To change which versions are deployed, edit `lib/versions/deploy-config.ts`:

```ts
export const DEPLOY_VERSIONS: string[] = ['v1', 'v2', 'v3'];
```

---

## Lambda Functions

All Lambda functions use Node.js 22.x runtime, ESM output format, minified bundles with source maps, and `aws-xray-sdk-core` for X-Ray tracing.

| Function Name               | Stack                      | Service                                       | Memory           | Timeout | Tracing | Log Retention |
| --------------------------- | -------------------------- | --------------------------------------------- | ---------------- | ------- | ------- | ------------- |
| `fm-{stage}-expenses`       | LambdaExpensesStack (v2)   | Expenses CRUD                                 | default (128 MB) | 30s     | Active  | 3 months      |
| `fm-{stage}-documents`      | LambdaDocumentsStack (v2)  | Documents catalog                             | default (128 MB) | 30s     | Active  | 3 months      |
| `fm-{stage}-currencies`     | LambdaCurrenciesStack (v2) | Currencies catalog                            | default (128 MB) | 30s     | Active  | 3 months      |
| `fm-{stage}-users`          | LambdaUsersStack (v2)      | Users CRUD                                    | default (128 MB) | 30s     | Active  | 3 months      |
| `fm-{stage}-pre-signup`     | CognitoStack (v1)          | Cognito PreSignUp trigger                     | default (128 MB) | 10s     | Active  | 3 months      |
| `fm-{stage}-custom-message` | CognitoStack (v1)          | Cognito CustomMessage trigger                 | default (128 MB) | 10s     | Active  | 3 months      |
| `fm-{stage}-user-sync`      | CognitoStack (v1)          | Cognito PostConfirmation + PostAuthentication | default (128 MB) | 10s     | Active  | 3 months      |
| `fm-{stage}-notifications`  | MonitoringStack (v3)       | SES alarm email notifications                 | default (128 MB) | 10s     | Active  | 3 months      |

---

## Project Structure

```
infra/
├── bin/
│   └── infra.ts                          # CDK app entry point
├── lib/
│   ├── config/
│   │   ├── entry-config.ts               # Version resolution and stack filtering logic
│   │   └── versions.ts                   # Registry: version -> stack factories
│   ├── core/
│   │   └── base-stack.ts                 # BaseStack with tags, naming, dependency resolution
│   ├── utils/
│   │   ├── cross-version.ts              # exportForCrossVersion / importFromVersion helpers
│   │   └── types.ts                      # StackDeps, StackFactory, NamedStackFactory
│   └── versions/
│       ├── deploy-config.ts              # DEPLOY_VERSIONS array (controls what gets deployed)
│       ├── v1/
│       │   ├── index.ts                  # v1 stack registration (Assets, Auth)
│       │   ├── stacks.ts                 # ActiveStack enum for v1
│       │   ├── assets-bucket-stack.ts    # S3 assets bucket
│       │   └── cognito-stack.ts          # Cognito User Pool, IdPs, triggers
│       ├── v2/
│       │   ├── index.ts                  # v2 stack registration (7 stacks)
│       │   ├── stacks.ts                 # ActiveStack enum for v2
│       │   ├── api-gateway-stack.ts      # REST API, authorizer, custom domain
│       │   ├── lambda-expenses-stack.ts  # Expenses Lambda + routes
│       │   ├── lambda-documents-stack.ts # Documents Lambda + routes
│       │   ├── lambda-currencies-stack.ts# Currencies Lambda + routes
│       │   ├── lambda-users-stack.ts     # Users Lambda + routes
│       │   ├── api-docs-stack.ts         # OpenAPI documentation parts
│       │   ├── api-docs.ts              # ApiDocumentation helper class
│       │   └── amplify-hosting-stack.ts  # Amplify web hosting + custom domain
│       └── v3/
│           ├── index.ts                  # v3 stack registration (Monitoring)
│           ├── stacks.ts                 # ActiveStack enum for v3
│           └── monitoring-stack.ts       # Dashboard, 14 alarms, SNS, EventBridge
├── cdk.json
└── package.json
```
