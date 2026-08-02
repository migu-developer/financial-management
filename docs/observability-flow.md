# Observability and Monitoring

![Observability and Monitoring Flow](https://github.com/user-attachments/assets/0f22d9f4-e3e1-444d-bab6-198949a25495)

## Overview

The monitoring stack (v3) provides a CloudWatch dashboard with widget sections for every subsystem, 24 alarms plus a composite "Chat-Unhealthy" alarm covering API Gateway, Lambda (services + AI chat), Step Functions, AppSync Events and Cognito triggers, and an automated alert pipeline that delivers formatted emails via SES when alarms fire or Amplify builds complete. The chat Lambdas emit business metrics in EMF format (namespace `FinancialManagement`).

The AI chat workflow is hardened so it **never leaves the client hanging**: a catch-all error path publishes a friendly message to the user and then fails the execution (so alarms still fire). See the [Resilience model](#resilience-model-ai-chat) and [How to debug one conversation](#how-to-debug-one-failed-chat-conversation) below.

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

| Section                        | Metrics                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Gateway                    | 5xx errors, 4xx errors, latency (p50, p90, p99), request count                                                                                                                                                                                            |
| Lambda Services                | Invocations, errors, duration, throttles for every service AND chat Lambda (expenses, documents, currencies, users, chat handler + 5 chat workflow Lambdas)                                                                                               |
| Cognito Triggers               | Errors for pre-signup, custom-message, user-sync Lambdas                                                                                                                                                                                                  |
| AI Chat Workflow               | Step Functions executions (started/succeeded/failed/timed out) + execution time p90                                                                                                                                                                       |
| AI Chat Business Metrics (EMF) | Conversation outcomes (`ChatMessageReceived`, `ChatQueryExecuted`, `ChatExpenseCreated`, `ChatClarificationSent`, `ChatExpenseCancelled`) and Errors & anomalies (`ChatUnknownIntent`, `ChatWorkflowError`, `ChatPublishFailed`, `ChatPreviewSuperseded`) |
| Amplify Hosting                | Requests, 4xx/5xx errors, latency                                                                                                                                                                                                                         |
| Alarm Status                   | Live status of every alarm                                                                                                                                                                                                                                |

Additionally, a **Logs Insights** widget queries Lambda error logs across all service functions.

## Alarms (24 total + 1 composite)

Every alarm below is a billable **alarm-metric** ($0.10/month each); the
composite is a flat $0.50/month. Total: **$2.90/month**. See
[What is deliberately NOT alarmed](#what-is-deliberately-not-alarmed).

### API Gateway alarms (2)

| Alarm           | Metric          | Threshold | Period | Eval / Datapoints |
| --------------- | --------------- | --------- | ------ | ----------------- |
| API 5xx Errors  | `5XXError` Sum  | > 5       | 1 min  | 3 eval / 2 dp     |
| API Latency p99 | `Latency` (p99) | > 5000 ms | 1 min  | 5 eval / 3 dp     |

Both require a SUSTAINED signal rather than a single datapoint: one 5xx or one
slow request is noise at this volume, so alarming on it would only cause alert
fatigue.

### Lambda alarms (12)

One `Errors` alarm per function — the API-facing services (expenses, documents,
currencies, users), the UpdateRates scheduler, and each AI chat Lambda (chat
handler, execute-query, validate-fields, create-expense, save-and-publish,
save-preview, analyze-receipt):

Settings differ by role, so they are listed per group rather than averaged into
one misleading row:

| Group                                                        | Threshold | Period | Eval / Datapoints |
| ------------------------------------------------------------ | --------- | ------ | ----------------- |
| API-facing services (expenses, documents, currencies, users) | > 3       | 1 min  | 3 eval / 2 dp     |
| Chat handler (synchronous, must ACK in under a second)       | > 3       | 1 min  | 3 eval / 2 dp     |
| Chat workflow task Lambdas (background)                      | > 3       | 5 min  | 3 eval / 2 dp     |
| UpdateRates (runs once a day)                                | > 2       | 24 h   | 1 eval / 1 dp     |

The background task Lambdas use a longer period so an LLM cold start does not
look like an outage. UpdateRates is single-datapoint because it only runs once
a day — waiting for three windows would mean a three-day delay.

### AI Chat workflow alarms (4)

| Alarm                           | Namespace    | Metric               | Trigger                      |
| ------------------------------- | ------------ | -------------------- | ---------------------------- |
| ChatWorkflow-ExecutionsFailed   | `AWS/States` | `ExecutionsFailed`   | > 2 per 5-min, 3 eval / 2 dp |
| ChatWorkflow-ExecutionsTimedOut | `AWS/States` | `ExecutionsTimedOut` | > 0, 3 eval / 3 dp           |
| ChatWorkflow-ExecutionsAborted  | `AWS/States` | `ExecutionsAborted`  | > 0, 1 eval / 1 dp           |
| ChatWorkflow-LatencyP90High     | `AWS/States` | `ExecutionTime` p90  | > 60 s, 3 eval / 2 dp        |

A Bedrock failure kills the conversation without touching any Lambda — `ExecutionsFailed` watches the workflow itself. It is deliberately NOT single-datapoint: the catch-all already publishes a friendly message to the user on every failure, so one failed execution is not a silent hang. It alarms on a sustained PATTERN instead (>2 failures in 2 of 3 five-minute windows). The cases where the user truly got nothing stay single-datapoint sensitive: `Chat-PublishFailed` (the error publish itself failed) and `ExecutionsAborted`. Abandoned HITL previews are now caught at the 7-day mark and end gracefully, so `ExecutionsTimedOut` should stay ~0; a non-zero value means the 8-day execution backstop fired (a real anomaly), hence it requires a sustained signal before paging. `ExecutionTime` p90 alarms when conversations get slow.

### AI Chat business-metric alarm (1) + composite

| Alarm              | Namespace             | Metric              | Trigger            |
| ------------------ | --------------------- | ------------------- | ------------------ |
| Chat-PublishFailed | `FinancialManagement` | `ChatPublishFailed` | > 0, 1 eval / 1 dp |

**`Chat-Unhealthy` (CompositeAlarm)** is the single actionable chat-health
signal — it ORs `ChatWorkflow-ExecutionsFailed`, AppSync `FailedEvents`,
`Chat-PublishFailed`, and every chat Lambda error alarm (handler + 5 task
Lambdas). Page/escalate on this one.

### AppSync Events alarms (2)

| Alarm                      | Namespace     | Metric         | Trigger            |
| -------------------------- | ------------- | -------------- | ------------------ |
| AppSyncEvents-5xx-Errors   | `AWS/AppSync` | `5XXError`     | > 0, 1 eval / 1 dp |
| AppSyncEvents-FailedEvents | `AWS/AppSync` | `FailedEvents` | > 0, 1 eval / 1 dp |

Dimension is `EventAPIId` (verified against the metrics the deployed Event API actually emits).

### Cognito trigger alarms (3)

All three: `Errors` Sum over a 5-minute period, `> 1`, 3 eval / 2 datapoints.

| Alarm                 | Lambda                      |
| --------------------- | --------------------------- |
| Pre-Signup Errors     | `fm-{stage}-pre-signup`     |
| Custom-Message Errors | `fm-{stage}-custom-message` |
| User-Sync Errors      | `fm-{stage}-user-sync`      |

## What is deliberately NOT alarmed

CloudWatch bills **$0.10 per alarm-metric per month**, and an alarm nobody can
act on is pure cost plus noise. Two signals were intentionally dropped (July
2026), taking the alarm bill from $3.90 to $2.80/month (now $2.90 with the
receipt-analysis Lambda added):

| Dropped                         | Why                                                                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-Lambda `Throttles`** (10) | No function sets `reservedConcurrentExecutions`, so throttling could only come from the account-level limit of 1000 concurrent executions — unreachable at this workload. A throttled invocation also surfaces as `Errors` on the function and 5xx on API Gateway, both still alarmed. |
| **`Api-4xx-Spike`** (1)         | 4xx means the **client** sent a bad request (expired token, validation failure). It is not a service fault and not actionable by an on-call alert. A genuine server-side problem appears as 5xx.                                                                                       |

Both metrics remain on the **dashboard** widgets for trend analysis — dashboard
widgets are free within the first three dashboards, so no visibility was lost.

> Note: **consolidating** alarms does not reduce cost. Metric math alarms are
> billed per metric referenced, so folding 10 alarms into one expression over 10
> metrics costs the same $1.00. The only lever is removing metrics from
> monitoring altogether, which is why these two were dropped rather than merged.

## Business Metrics (EMF)

Chat Lambdas emit Embedded Metric Format counters through `MetricsServiceImplementation` (`@services/shared`) — no API calls or extra IAM, CloudWatch converts the structured log lines into metrics:

| Metric                          | Emitted by                                | Meaning                                     |
| ------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `ChatMessageReceived`           | chat handler (HTTP)                       | Well-formed send-message accepted           |
| `ChatWorkflowStartFailure`      | chat handler (HTTP)                       | Persist or `StartExecution` failed          |
| `ChatPreviewSuperseded`         | chat handler (HTTP)                       | Pending preview released (user iterated)    |
| `ChatQueryExecuted`             | chat-execute-query                        | NL query answered                           |
| `ChatMalformedModelJson`        | chat-execute-query                        | Model emitted non-JSON; degraded (no throw) |
| `ChatPreviewRequested`          | chat-save-preview                         | HITL preview shown (SF paused)              |
| `ChatExpenseCreated`            | chat-create-expense                       | Expense created via chat                    |
| `ChatAssistantMessagePublished` | chat-save-and-publish                     | Any non-error reply delivered               |
| `ChatQueryAnswerSent`           | chat-save-and-publish                     | QUERY answer delivered (`query`)            |
| `ChatExpenseConfirmationSent`   | chat-save-and-publish                     | Expense confirmation delivered (`created`)  |
| `ChatExpenseCancelled`          | chat-save-and-publish                     | User cancelled the preview (`cancelled`)    |
| `ChatClarificationSent`         | chat-save-and-publish                     | Clarification delivered (`clarification`)   |
| `ChatUnknownIntent`             | chat-save-and-publish                     | Message not understood (`unknown`)          |
| `ChatWorkflowError`             | chat-save-and-publish                     | Catch-all fired (`error`)                   |
| `ChatPublishFailed`             | chat-save-and-publish / chat-save-preview | AppSync publish itself failed               |

Namespace: `FinancialManagement`, dimension `service=chat`. Intent distribution
(QUERY/CREATE/UNKNOWN) is derived from the per-branch counters above —
`ClassifyIntent` is a direct Bedrock task (no Lambda) and `PreviewExpired` is a
`Succeed` state (no compute), so neither has a dedicated counter.

## Notification Lambda

The `fm-{stage}-notifications` Lambda receives SNS events and sends formatted alert emails.

### Alarm parsing

The `parseAlarmMessage()` function handles two event types:

**CloudWatch alarm** (JSON from SNS):

```json
{
  "AlarmName": "fm-prod-expenses-errors",
  "NewStateReason": "Threshold crossed: 1 error in 5 minutes",
  "Trigger": {
    "Namespace": "AWS/Lambda",
    "MetricName": "Errors",
    "Dimensions": [{ "name": "FunctionName", "value": "fm-prod-expenses" }]
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

All Lambda functions have `Tracing.ACTIVE` enabled; the chat state machine has `tracingEnabled: true`. The Powertools Tracer provides:

- **Cold start annotation**: `tracer.annotateColdStart()` in every handler
- **Custom annotations**: trigger source, alarm name, user ID, etc.
- **AWS SDK tracing**: `tracer.captureAWSv3Client()` wraps S3, SES, Cognito, SFN clients
- **Subsegments**: Each repository method creates an X-Ray subsegment for database calls

### Following one chat conversation end-to-end

A Step Function does **not** appear as a single selectable trace like a Lambda — it's a node in the service map, and **each execution has its own trace** (open it from the Step Functions console → execution → "Trace"). To correlate every span of one conversation turn:

- Every chat task Lambda annotates `userId`, `sessionId` and `messageId`. The SFN execution name **is** the `messageId`, so filtering X-Ray by `annotation.messageId = "<id>"` returns all task spans for that turn.
- The AppSync publish used native `fetch` (not auto-instrumented), so it showed as a raw DNS host. It's now wrapped in a **named `remote` subsegment** (`TracerServiceImplementation.traceRemote`) so the service-map node reads **`AppSyncEvents`**, with `channel` / `httpStatus` annotations and the event `type` in metadata.

### Sampling

At current volume the **default X-Ray sampling rule** (1 req/s reservoir + 5%) captures every chat trace within the free tier. If volume grows, add a rule that keeps 100% of error traces and samples the happy path; track it against the X-Ray line in Cost Explorer. Deferred until volume justifies it.

## Structured Logging

All Lambda functions use Powertools Logger with:

- **Service name**: unique per Lambda (`cognito-custom-message`, `alarm-notifications`, etc.)
- **Format**: JSON (structured)
- **Cold start**: automatically annotated
- **Correlation**: `awsRequestId` from Lambda context
- **Log retention**: 3 months for most services. The chat Lambdas and the chat state-machine log group are **stage-aware** (prod `THREE_MONTHS`, dev `ONE_MONTH`) for cost control.
- **State-machine log level (cost lever)**: stage-aware — `LogLevel.ALL` with execution data in dev, `LogLevel.ERROR` in prod. CloudWatch Logs bills on ingestion volume; logging every successful transition's full input/output in prod is the dominant cost as chat volume grows, and the catch-all error path already captures every failure.

Example log entry:

```json
{
  "level": "INFO",
  "message": "Processing alarm notification",
  "service": "alarm-notifications",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "xray_trace_id": "1-abc-def",
  "alarmName": "fm-prod-expenses-errors",
  "severity": "CRITICAL",
  "resolvedService": "Lambda (fm-prod-expenses)"
}
```

## Resilience model (AI chat)

Why the chat workflow never leaves the client hanging:

- Every Bedrock task retries transient 503 / throttle / timeout (4 attempts, x2 backoff); every task Lambda retries transient infra errors (3 attempts) — **except `CreateExpense`**, which is not idempotent (a retry could duplicate the expense), so its failures go straight to the catch-all.
- **Catch-all**: any unhandled task failure routes to `PublishError`, which publishes a friendly STATIC message to the user (`type: 'error'`, no Bedrock dependency — that's what may have failed) and then `Fail`s the execution, so `ExecutionsFailed` still alarms while the client's typing indicator clears and the user gets a reply.
- `WaitForConfirmation` keeps its 7-day `States.Timeout` → `PreviewExpired` (silent), plus a second catch for any other error → `PublishError`.
- Explicit `taskTimeout` bounds every Bedrock (60 s) and Lambda (40 s) task.
- Residual gap: if `PublishError` itself fails (AppSync down after its retries) no event reaches the client — candidate for a client-side "still working…" timeout.

## How to debug one failed chat conversation

1. Get the `messageId` (= SFN execution name) from the client, the API response, or a `ChatWorkflowError` log.
2. Step Functions console → execution `<messageId>` → the graph shows which state went red and the catch path taken.
3. X-Ray → filter `annotation.messageId = "<messageId>"` → every task span, including the `AppSyncEvents` publish node.
4. CloudWatch dashboard → check whether `ChatWorkflowError` / `ChatPublishFailed` ticked and whether `Chat-Unhealthy` is in ALARM.

## Testing the chat workflow without deploying

- **Step Functions Local + MockConfigFile** (`infra/test/sfn-local/`, `pnpm --filter @infra test:sfn-local`): runs the real ASL in Docker with mocked Bedrock/Lambda responses across every branch + the retry/catch paths.
- **TestState API** (`pnpm --filter @infra test:sfn-teststate`): tests individual states (intent routing, catch routing) against **dev** with a narrow IAM role — never prod.
- **CDK assertions** (`step-functions-chat-stack.test.ts`): assert retries, catch-all wiring, `PublishError → Fail`, and the stage-aware log level.

## Related Code

| Component             | Path                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Monitoring CDK stack  | `infra/lib/versions/v3/monitoring-stack.ts`                                    |
| Notification Lambda   | `packages/notifications/src/handlers/notify.ts`                                |
| Alarm parser          | `packages/notifications/src/domain/alarm-parser.ts`                            |
| SES email sender      | `packages/notifications/src/infrastructure/ses-sender.ts`                      |
| Alert email template  | `packages/transactional/emails/{en,es}/service-alert.tsx`                      |
| Dashboard config      | `infra/lib/versions/v3/monitoring-stack.ts` (widgets section)                  |
| Chat state machine    | `infra/lib/versions/v2/step-functions-chat-stack.ts`                           |
| Chat task handlers    | `services/chat/src/handlers/sfn-*.ts`                                          |
| AppSync publisher     | `services/chat/src/infrastructure/services/appsync-event-publisher.service.ts` |
| EMF metrics port      | `services/shared/src/domain/services/metrics.ts` + `MetricsServiceImp.ts`      |
| SFN Local / TestState | `infra/test/sfn-local/`, `infra/scripts/sfn-{local-test.sh,teststate.ts}`      |
