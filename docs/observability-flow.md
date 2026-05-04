# Observability and Monitoring

![Observability and Monitoring Flow](https://github.com/user-attachments/assets/0f22d9f4-e3e1-444d-bab6-198949a25495)

## Overview

The monitoring stack (v3) provides a CloudWatch dashboard with 6 widget sections, 14 alarms covering API Gateway, Lambda, and Cognito triggers, and an automated alert pipeline that delivers formatted emails via SES when alarms fire or Amplify builds complete.

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

The dashboard has 6 widget sections:

| Section            | Metrics                                                         |
| ------------------ | --------------------------------------------------------------- |
| API Gateway        | 5xx errors, 4xx errors, latency (p50, p90, p99), request count  |
| Lambda: Expenses   | Invocations, errors, duration, throttles, concurrent executions |
| Lambda: Documents  | Same metrics as above                                           |
| Lambda: Currencies | Same metrics as above                                           |
| Lambda: Users      | Same metrics as above                                           |
| Cognito Triggers   | Errors for pre-signup, custom-message, user-sync Lambdas        |

Additionally, a **Logs Insights** widget queries Lambda error logs across all service functions.

## Alarms (14 total)

### API Gateway alarms (3)

| Alarm           | Metric          | Threshold  | Period | Eval Periods |
| --------------- | --------------- | ---------- | ------ | ------------ |
| API 5xx Errors  | `5XXError`      | >= 1       | 5 min  | 1            |
| API 4xx Errors  | `4XXError`      | >= 10      | 5 min  | 1            |
| API Latency p99 | `Latency` (p99) | >= 5000 ms | 5 min  | 2            |

### Lambda alarms (8)

Each of the 4 services (expenses, documents, currencies, users) has 2 alarms:

| Alarm               | Metric      | Threshold | Period | Eval Periods |
| ------------------- | ----------- | --------- | ------ | ------------ |
| {Service} Errors    | `Errors`    | >= 1      | 5 min  | 1            |
| {Service} Throttles | `Throttles` | >= 1      | 5 min  | 1            |

### Cognito trigger alarms (3)

| Alarm                 | Lambda                      | Metric   | Threshold |
| --------------------- | --------------------------- | -------- | --------- |
| Pre-Signup Errors     | `fm-{stage}-pre-signup`     | `Errors` | >= 1      |
| Custom-Message Errors | `fm-{stage}-custom-message` | `Errors` | >= 1      |
| User-Sync Errors      | `fm-{stage}-user-sync`      | `Errors` | >= 1      |

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
