# Observability and Monitoring

![Observability and Monitoring Flow](https://github.com/user-attachments/assets/0f22d9f4-e3e1-444d-bab6-198949a25495)

## Overview

The monitoring stack (v3) provides a CloudWatch dashboard with widget sections for every subsystem, 31 alarms covering API Gateway, Lambda (services + AI chat), Step Functions, AppSync Events and Cognito triggers, and an automated alert pipeline that delivers formatted emails via SES when alarms fire or Amplify builds complete. The chat Lambdas also emit business metrics in EMF format (namespace `FinancialManagement`).

## Alert Flow

```
CloudWatch Alarm / EventBridge Rule
  |
  |-- Alarm state change: OK -> ALARM
  |   or: Amplify build event (SUCCEED/FAILED/STARTED)
  |
  v
SNS Topic (monitoring)
  |
  v
Lambda: fm-{stage}-notifications
  |-- parseAlarmMessage()
  |     |-- CloudWatch alarm: extracts AlarmName, Severity, Service, Reason
  |     |-- Amplify event: extracts appId, branch, jobId, jobStatus
  |
  |-- sendAlertEmail()
  |     |-- Loads HTML template from S3: {EMAILS_PREFIX}/{locale}/service-alert.html
  |     |-- Replaces placeholders: {{alarmName}}, {{severity}}, {{service}}, {{description}}, {{timestamp}}, {{dashboardUrl}}, {{stage}}
  |     |-- Sends via SES (from ALERT_EMAIL_FROM to ALERT_EMAIL_TO)
  |
  v
Email (formatted HTML alert)
```

## CloudWatch Dashboard

Dashboard sections:

| Section          | Metrics                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Gateway      | 5xx errors, 4xx errors, latency (p50, p90, p99), request count                                                                                              |
| Lambda Services  | Invocations, errors, duration, throttles for every service AND chat Lambda (expenses, documents, currencies, users, chat handler + 5 chat workflow Lambdas) |
| Cognito Triggers | Errors for pre-signup, custom-message, user-sync Lambdas                                                                                                    |
| AI Chat Workflow | Step Functions executions (started/succeeded/failed/timed out) + execution time p90                                                                         |
| Amplify Hosting  | Requests, 4xx/5xx errors, latency                                                                                                                           |
| Alarm Status     | Live status of every alarm                                                                                                                                  |

Additionally, a **Logs Insights** widget queries Lambda error logs across all service functions.

## Alarms (31 total)

### API Gateway alarms (3)

| Alarm           | Metric          | Threshold  | Period | Eval Periods |
| --------------- | --------------- | ---------- | ------ | ------------ |
| API 5xx Errors  | `5XXError`      | >= 1       | 5 min  | 1            |
| API 4xx Errors  | `4XXError`      | >= 10      | 5 min  | 1            |
| API Latency p99 | `Latency` (p99) | >= 5000 ms | 5 min  | 2            |

### Lambda alarms (21)

Each API-facing service (expenses, documents, currencies, users) and each AI chat Lambda (chat handler, execute-query, validate-fields, create-expense, save-and-publish, save-preview) has 2 alarms; the UpdateRates scheduler has errors only:

| Alarm               | Metric      | Threshold | Period | Eval Periods |
| ------------------- | ----------- | --------- | ------ | ------------ |
| {Service} Errors    | `Errors`    | >= 1      | 5 min  | 1            |
| {Service} Throttles | `Throttles` | >= 1      | 5 min  | 1            |

### AI Chat workflow alarms (2)

| Alarm                           | Namespace    | Metric               | Trigger                  |
| ------------------------------- | ------------ | -------------------- | ------------------------ |
| ChatWorkflow-ExecutionsFailed   | `AWS/States` | `ExecutionsFailed`   | >= 1 datapoint           |
| ChatWorkflow-ExecutionsTimedOut | `AWS/States` | `ExecutionsTimedOut` | sustained (3 datapoints) |

A Bedrock failure kills the conversation without touching any Lambda — `ExecutionsFailed` watches the workflow itself. Abandoned HITL previews are now caught at the 7-day mark and end gracefully, so `ExecutionsTimedOut` should stay ~0; a non-zero value means the 8-day execution backstop fired (a real anomaly), hence it requires a sustained signal before paging.

### AppSync Events alarms (2)

| Alarm                      | Namespace     | Metric         | Threshold |
| -------------------------- | ------------- | -------------- | --------- |
| AppSyncEvents-5xx-Errors   | `AWS/AppSync` | `5XXError`     | >= 1      |
| AppSyncEvents-FailedEvents | `AWS/AppSync` | `FailedEvents` | >= 1      |

Dimension is `EventAPIId` (verified against the metrics the deployed Event API actually emits).

### Cognito trigger alarms (3)

| Alarm                 | Lambda                      | Metric   | Threshold |
| --------------------- | --------------------------- | -------- | --------- |
| Pre-Signup Errors     | `fm-{stage}-pre-signup`     | `Errors` | >= 1      |
| Custom-Message Errors | `fm-{stage}-custom-message` | `Errors` | >= 1      |
| User-Sync Errors      | `fm-{stage}-user-sync`      | `Errors` | >= 1      |

## Business Metrics (EMF)

Chat Lambdas emit Embedded Metric Format counters through `MetricsServiceImplementation` (`@services/shared`) — no API calls or extra IAM, CloudWatch converts the structured log lines into metrics:

| Metric                          | Emitted by            | Meaning                          |
| ------------------------------- | --------------------- | -------------------------------- |
| `ChatQueryExecuted`             | chat-execute-query    | NL query answered                |
| `ChatPreviewRequested`          | chat-save-preview     | HITL preview shown (SF paused)   |
| `ChatExpenseCreated`            | chat-create-expense   | Expense created via chat         |
| `ChatAssistantMessagePublished` | chat-save-and-publish | Message delivered over WebSocket |

Namespace: `FinancialManagement`, dimension `service=chat`.

## Notification Lambda

The `fm-{stage}-notifications` Lambda receives SNS events and sends formatted alert emails.

### Alarm parsing

The `parseAlarmMessage()` function handles two event types:

**CloudWatch alarm** (JSON from SNS):

```json
{
  "AlarmName": "fm-dev-expenses-errors",
  "NewStateReason": "Threshold crossed: 1 error in 5 minutes",
  "Trigger": {
    "Namespace": "AWS/Lambda",
    "MetricName": "Errors",
    "Dimensions": [{ "name": "FunctionName", "value": "fm-dev-expenses" }]
  }
}
```

**Amplify build event** (from EventBridge via SNS):

```json
{
  "source": "aws.amplify",
  "detail-type": "Amplify Deployment Status Change",
  "detail": {
    "appId": "d1234abc",
    "branchName": "main",
    "jobId": "42",
    "jobStatus": "SUCCEED"
  }
}
```

### Severity resolution

| Metric                                         | Severity |
| ---------------------------------------------- | -------- |
| `5XXError`, `Errors`, `Throttles`, `5xxErrors` | CRITICAL |
| All other metrics                              | WARNING  |
| Amplify build FAILED                           | CRITICAL |
| Amplify build SUCCEED/STARTED                  | INFO     |

### Service resolution

| Namespace            | Resolution                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `AWS/ApiGateway`     | "API Gateway"                                                       |
| `AWS/Lambda`         | "Lambda ({FunctionName})" -- includes function name from dimensions |
| `AWS/AmplifyHosting` | "Amplify"                                                           |
| `AWS/Cognito`        | "Cognito"                                                           |

## EventBridge Integration

An EventBridge rule captures Amplify build status events:

```
Source: aws.amplify
Detail-type: Amplify Deployment Status Change
Target: SNS monitoring topic -> notification Lambda
```

This means the same notification Lambda handles both CloudWatch alarms and Amplify deploy events, using a unified email template.

## X-Ray Tracing

All Lambda functions have `Tracing.ACTIVE` enabled. The Powertools Tracer provides:

- **Cold start annotation**: `tracer.annotateColdStart()` in every handler
- **Custom annotations**: trigger source, alarm name, user ID, etc.
- **AWS SDK tracing**: `tracer.captureAWSv3Client()` wraps S3, SES, Cognito clients
- **Subsegments**: Each repository method creates an X-Ray subsegment for database calls

## Structured Logging

All Lambda functions use Powertools Logger with:

- **Service name**: unique per Lambda (`cognito-custom-message`, `alarm-notifications`, etc.)
- **Format**: JSON (structured)
- **Cold start**: automatically annotated
- **Correlation**: `awsRequestId` from Lambda context
- **Log retention**: 3 months (`RetentionDays.THREE_MONTHS`)

Example log entry:

```json
{
  "level": "INFO",
  "message": "Processing alarm notification",
  "service": "alarm-notifications",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "xray_trace_id": "1-abc-def",
  "alarmName": "fm-dev-expenses-errors",
  "severity": "CRITICAL",
  "resolvedService": "Lambda (fm-dev-expenses)"
}
```

## Related Code

| Component            | Path                                                          |
| -------------------- | ------------------------------------------------------------- |
| Monitoring CDK stack | `infra/lib/versions/v3/monitoring-stack.ts`                   |
| Notification Lambda  | `packages/notifications/src/handlers/notify.ts`               |
| Alarm parser         | `packages/notifications/src/domain/alarm-parser.ts`           |
| SES email sender     | `packages/notifications/src/infrastructure/ses-sender.ts`     |
| Alert email template | `packages/transactional/emails/{en,es}/service-alert.tsx`     |
| Dashboard config     | `infra/lib/versions/v3/monitoring-stack.ts` (widgets section) |
