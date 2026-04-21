# @packages/notifications

Lambda handler for CloudWatch alarm and Amplify build event notifications via SES email. Parses SNS messages, resolves severity and service metadata, loads HTML templates from S3, and sends formatted alert emails.

## Responsibility

Receives SNS events triggered by CloudWatch alarms or Amplify deployment status changes, transforms them into a structured alert payload, renders an HTML email template from S3 with placeholder substitution, and sends the notification via Amazon SES.

## Exports

This package does not export a public API. It provides a single Lambda `handler` function as the entry point for the SNS-triggered notification Lambda.

## Event Flow

```
CloudWatch Alarm / Amplify Build Event
  -> SNS Topic
    -> Lambda (this package)
      -> Parse alarm message (CloudWatch or Amplify)
      -> Resolve severity + service
      -> Load HTML template from S3
      -> Replace placeholders
      -> Send email via SES
```

## Supported Event Types

### CloudWatch Alarm Messages

Standard CloudWatch alarm JSON with `AlarmName`, `NewStateValue`, `NewStateReason`, `StateChangeTime`, and `Trigger` (metric name, namespace, dimensions).

**Service resolution** from AWS namespace:

| Namespace            | Resolved Service                               |
| -------------------- | ---------------------------------------------- |
| `AWS/ApiGateway`     | API Gateway                                    |
| `AWS/Lambda`         | Lambda (includes FunctionName from dimensions) |
| `AWS/AmplifyHosting` | Amplify                                        |
| `AWS/Cognito`        | Cognito                                        |

**Severity resolution** from metric name:

| Severity   | Metric Names                                   |
| ---------- | ---------------------------------------------- |
| `CRITICAL` | `5XXError`, `Errors`, `Throttles`, `5xxErrors` |
| `WARNING`  | All other metrics                              |

### Amplify Build Events

Detected by `source === 'aws.amplify'` and `detail-type === 'Amplify Deployment Status Change'`. Contains `appId`, `branchName`, `jobId`, and `jobStatus` (`FAILED`, `SUCCEED`, `STARTED`).

- `FAILED` status resolves to `CRITICAL` severity
- Other statuses resolve to `INFO` severity

## Alert Payload

Both event types are normalized into an `AlertPayload`:

```typescript
interface AlertPayload {
  alarmName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  service: string;
  description: string;
  timestamp: string;
  dashboardUrl: string;
}
```

## S3 Template Loading

The email HTML body is loaded from S3. The template key is constructed as:

```
{EMAILS_PREFIX}/{locale}/{TEMPLATE_NAME}.html
```

Where `TEMPLATE_NAME` is always `service-alert` and `locale` defaults to `en`.

Templates are produced by the `@packages/transactional` package (the `service-alert` email component) and uploaded via `pnpm email:export && pnpm email:upload`.

### Placeholder Substitution

The following placeholders in the HTML template are replaced at runtime:

| Placeholder        | Source                           |
| ------------------ | -------------------------------- |
| `{{alarmName}}`    | `payload.alarmName`              |
| `{{severity}}`     | `payload.severity`               |
| `{{service}}`      | `payload.service`                |
| `{{description}}`  | `payload.description`            |
| `{{timestamp}}`    | `payload.timestamp`              |
| `{{dashboardUrl}}` | `payload.dashboardUrl`           |
| `{{stage}}`        | `process.env.STAGE` (uppercased) |

## Email Format

- **Subject:** `[{STAGE}] [{severity}] {alarmName} -- {service}`
- **HTML body:** Rendered S3 template with placeholders replaced
- **Text body:** Plain-text fallback with severity, alarm name, service, timestamp, and description

## Environment Variables

| Variable             | Required | Description                                     |
| -------------------- | -------- | ----------------------------------------------- |
| `ALERT_EMAIL_FROM`   | Yes      | SES-verified sender email address               |
| `ALERT_EMAIL_TO`     | Yes      | Recipient email address                         |
| `DASHBOARD_URL`      | Yes      | URL to CloudWatch dashboard (included in email) |
| `ASSETS_BUCKET_NAME` | Yes      | S3 bucket containing email HTML templates       |
| `EMAILS_PREFIX`      | Yes      | S3 key prefix (e.g. `cognito/emails`)           |
| `STAGE`              | No       | Deployment stage, included in subject and body  |

## Structure

```
packages/notifications/
  src/
    index.ts                          # Lambda handler (SNS event loop)
    domain/
      types.ts                        # CloudWatchAlarmMessage, AmplifyBuildEvent, SNSEvent, AlertPayload
      alarm-parser.ts                 # parseAlarmMessage(), severity/service resolution
    infrastructure/
      ses-sender.ts                   # sendAlertEmail(), S3 template loading, placeholder substitution
  package.json
  tsconfig.json
  jest.config.ts
```

## Dependencies

### Internal (workspace)

- `@packages/config` -- ESLint configuration (devDependency)

### External

- `@aws-lambda-powertools/logger` -- Structured logging
- `@aws-lambda-powertools/tracer` -- X-Ray tracing
- `@aws-sdk/client-ses` -- SES email sending
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

Tests are colocated with source files (`*.test.ts`). The alarm parser tests cover both CloudWatch alarm and Amplify build event parsing. AWS SDK clients (SES, S3) are mocked in tests.
