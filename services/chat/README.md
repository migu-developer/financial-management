# @services/chat

AI-powered conversational expense service. Users register and query expenses in natural language; processing is fully asynchronous via an AWS Step Functions Standard workflow that invokes Amazon Bedrock directly, with answers delivered in real time over AppSync Events. Expense creation requires explicit user confirmation (Human-in-the-Loop via Task Tokens).

See [docs/ai-chat-flow.md](../../docs/ai-chat-flow.md) for the end-to-end architecture.

## Bounded Context

The **Chat** bounded context owns conversation state (`chat_sessions`, `chat_messages`), workflow orchestration boundaries (start/resume the ChatProcess state machine) and real-time event publishing. It deliberately does NOT own expense business rules — creation delegates to the existing `CreateExpenseUseCase` from `@services/expenses`, and queries reuse the existing expense repositories.

## API Endpoints

| Method | Path            | Description                                                    | Auth               |
| ------ | --------------- | -------------------------------------------------------------- | ------------------ |
| `POST` | `/chat`         | Persist user message, start the workflow, return immediate ACK | Cognito Authorizer |
| `POST` | `/chat/confirm` | Resolve a pending HITL preview (`{ taskToken, confirmed }`)    | Cognito Authorizer |

Responses arrive asynchronously on the AppSync Events channel `chat/{userId}/responses` (Cognito-authenticated WebSocket).

## Architecture

### Presentation Layer

- **`handlers/chat.ts`** -- Single Lambda entry (`fm-{stage}-chat`) routing both endpoints. Validates required env vars at init with `requireEnv`; SFN client wrapped with `captureAWSv3Client` for X-Ray.
- **`presentation/`** -- Application context, mixin Controller/Service, Router.

### Step Functions Task Handlers (`handlers/sfn-*.ts`)

| Handler                          | Lambda                             | Role in the workflow                                        |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `sfn-execute-query.ts`           | `fm-{stage}-chat-execute-query`    | Parses Nova Lite JSON, runs metrics/list via expense repos  |
| `sfn-validate-expense-fields.ts` | `fm-{stage}-chat-validate-fields`  | Resolves catalog names → ids, reports missing fields        |
| `sfn-create-expense.ts`          | `fm-{stage}-chat-create-expense`   | Creates the confirmed expense (delegates to expenses)       |
| `sfn-save-preview.ts`            | `fm-{stage}-chat-save-preview`     | `.waitForTaskToken`: stores preview + token, SF pauses      |
| `sfn-save-and-publish.ts`        | `fm-{stage}-chat-save-and-publish` | Terminal: persists assistant message + publishes to AppSync |

### Application Layer (use cases)

`send-message`, `confirm-pending-expense` (updates token status BEFORE `SendTaskSuccess` to avoid double-resume races), `execute-query`, `validate-expense-fields`, `create-expense-from-chat`, `save-assistant-message`.

### Domain Layer

- Ports: `chat-session.repository`, `chat-message.repository`, `workflow-starter.service`, `workflow-callback.service`, `event-publisher.service`.
- `domain/utils/parse-bedrock-json.ts` -- strips the markdown fences Nova sometimes emits. `parseBedrockJson` throws on bad JSON; `tryParseBedrockJson` returns `null` so callers can degrade gracefully instead of failing the workflow.
- `domain/utils/expense-type-synonyms.ts` -- maps Spanish prompt output (`ingreso`/`egreso`) to the English catalog names (`income`/`outcome`).

### Infrastructure Layer

- Postgres repositories (sessions, messages, catalog lookup) with `@trace` subsegments.
- `sfn-workflow-starter` / `sfn-workflow-callback` -- StartExecution / SendTaskSuccess adapters.
- `appsync-event-publisher` -- SigV4-signed HTTPS POST to the AppSync Events `/event` endpoint.

Prompts, Bedrock model ids and inference settings come from **`@packages/prompts`** (shared with the CDK stack) — never inlined here.

## Environment Variables

| Variable                                 | Used by                        | Notes                                   |
| ---------------------------------------- | ------------------------------ | --------------------------------------- |
| `CHAT_STATE_MACHINE_ARN`                 | chat handler                   | Injected by the LambdaChat stack        |
| `APPSYNC_HTTP_DNS`                       | save-and-publish, save-preview | Injected by the StepFunctionsChat stack |
| `APPSYNC_CHAT_NAMESPACE`                 | save-and-publish, save-preview | Channel namespace (`chat`)              |
| `DATABASE_URL` / `DATABASE_READONLY_URL` | all task Lambdas               | Stack props                             |

All required vars are validated at module scope with `requireEnv` — no fallbacks.

## Resilience (the client never hangs)

- **Retries**: Bedrock states retry transient 503/throttle/timeout; task Lambdas retry transient infra errors (via `addLambdaRetry`) — except `CreateExpense` (not idempotent → would duplicate).
- **Catch-all**: every fallible task `.addCatch(States.ALL)` → `PublishError` (publishes a static friendly message with `eventKind:'error'`) → `Fail`. The user always gets a reply; the run still ends `FAILED` for alarms.
- **Graceful degrade**: `tryParseBedrockJson` returns `null` on malformed model output so the handler degrades to a clarification/generic query instead of throwing.
- Explicit `taskTimeout` per task (Bedrock 60s, Lambda 40s). See [docs/ai-chat-flow.md](../../docs/ai-chat-flow.md#error-handling--resilience-never-leave-the-client-hanging).

## Observability

- X-Ray active tracing on every Lambda + `@trace` subsegments; SFN client captured. Task handlers annotate `userId`/`sessionId`/`messageId`; the AppSync publish is a named `AppSyncEvents` remote subsegment (`TracerServiceImplementation.traceRemote`).
- EMF business metrics via `MetricsServiceImplementation` / the `MetricsService` port (namespace `FinancialManagement`, dim `service=chat`): `ChatMessageReceived`, `ChatWorkflowStartFailure`, `ChatPreviewSuperseded`, `ChatQueryExecuted`, `ChatMalformedModelJson`, `ChatPreviewRequested`, `ChatExpenseCreated`, `ChatAssistantMessagePublished`, per-branch `ChatQueryAnswerSent`/`ChatExpenseConfirmationSent`/`ChatExpenseCancelled`/`ChatClarificationSent`/`ChatUnknownIntent`, `ChatWorkflowError`, `ChatPublishFailed`.
- Alarms (v3 Monitoring): per-Lambda errors/throttles, `ExecutionsFailed` (thresholded), `ExecutionsTimedOut`, `ExecutionsAborted`, `LatencyP90High`, `Chat-PublishFailed`, AppSync `5XXError`/`FailedEvents`, and the composite `Chat-Unhealthy`. See [docs/observability-flow.md](../../docs/observability-flow.md).

## Testing

```bash
pnpm --filter @services/chat test            # unit (use cases, services, utils)
# Integration (isolated schema, auto created/dropped):
DATABASE_SCHEMA=financial_management TEST_RUN_ID=x pnpm test:integration
# Per-Lambda local scripts (payload overridable via env vars):
pnpm run:file src/exec/sfn-validate-expense-fields.ts
```

The **whole state machine** is tested without deploying via Step Functions Local
with a MockConfigFile (`pnpm --filter @infra test:sfn-local`) — every branch,
retry and catch — see [`infra/test/sfn-local/`](../../infra/test/sfn-local/README.md).
