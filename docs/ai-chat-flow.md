# AI Chat — Conversational Expense Flow

## Overview

The AI Chat lets users register and query expenses in natural language ("Pagué 80000 pesos colombianos de mercado ayer", "¿Cuánto gasté este mes?"). Everything is **asynchronous** (Serverlesspresso pattern): the client gets an immediate ACK, an AWS Step Functions Standard workflow processes the message in the background invoking Amazon Bedrock directly, and the answer arrives in real time over an AppSync Events WebSocket. Expense creation requires explicit user confirmation (**Human-in-the-Loop** via Task Tokens).

## Request Flow

```
Client (AI Chat Drawer)
  |
  |-- POST /chat { content, sessionId? }              (Cognito JWT)
  v
API Gateway → Lambda fm-{stage}-chat
  |-- persists user message (chat_messages)
  |-- StartExecution on fm-{stage}-chat-process (async)
  |-- returns { status: "processing" } immediately
  v
Step Function "ChatProcess" (Standard):
  |
  |-- ClassifyIntent ............. Bedrock Nova Micro → QUERY | CREATE | UNKNOWN
  |
  |-- QUERY branch:
  |     ExtractSqlParams ......... Nova Lite (current date injected via $$.Execution.StartTime)
  |     ExecuteQuery ............. λ fm-{stage}-chat-execute-query (existing expense repos)
  |     GenerateQueryNL .......... Claude Haiku (user-facing answer)
  |     SaveQueryAnswer .......... λ save-and-publish
  |
  |-- CREATE branch:
  |     ExtractExpenseFields ..... Nova Lite
  |     ValidateFields ........... λ fm-{stage}-chat-validate-fields (catalog name → id)
  |     ├─ incomplete → GenerateClarification (Haiku) → save-and-publish
  |     └─ complete:
  |          GeneratePreview ..... Haiku ("...¿Confirmás?")
  |          WaitForConfirmation . λ save-preview (.waitForTaskToken — SF PAUSES)
  |            → client shows [Confirmar] [Cancelar]
  |            → POST /chat/confirm { taskToken, confirmed } → SendTaskSuccess
  |          ├─ confirmed → CreateExpense (λ) → GenerateConfirmation → save-and-publish
  |          └─ cancelled → GenerateCancellation → save-and-publish
  |
  |-- UNKNOWN → GenerateUnknown (Haiku) → save-and-publish
  v
AppSync Events (SigV4 publish to chat/{userId}/responses)
  v
Client WebSocket → message rendered in the drawer
```

## Components

| Component     | Resource                                                                                           | Notes                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Chat handler  | `fm-{stage}-chat` (LambdaChat stack)                                                               | Routes `POST /chat` + `POST /chat/confirm`                        |
| State machine | `fm-{stage}-chat-process` (StepFunctionsChat stack)                                                | Standard, 30 min timeout, X-Ray + full logging                    |
| Task Lambdas  | `fm-{stage}-chat-{execute-query, validate-fields, create-expense, save-and-publish, save-preview}` | All Node.js 24 ESM                                                |
| Realtime API  | `fm-{stage}-chat-events` (AppSyncEvents stack)                                                     | Cognito auth for clients, IAM SigV4 for backend                   |
| Tables        | `chat_sessions`, `chat_messages` (migration 4.0.0)                                                 | RLS + audit triggers; `task_token`/`task_token_status` drive HITL |

## Bedrock Model Routing (2-tier)

All prompt texts, model ids and inference settings live in **`@packages/prompts`** (single source of truth consumed by `services/chat` AND the CDK stack at synth time — see `CHAT_BEDROCK_PROMPTS`).

| Task                   | Model                             | Why                                                                                                  |
| ---------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Intent classification  | `amazon.nova-micro-v1:0`          | Cheap, deterministic, one-word output                                                                |
| Param/field extraction | `amazon.nova-lite-v1:0`           | Structured JSON output (parsed in Lambdas with `parseBedrockJson()` — Nova may emit markdown fences) |
| User-facing responses  | `us.anthropic.claude-haiku-4-5-…` | Quality matters; requires a cross-region **inference profile** ARN                                   |

All 9 Bedrock states have explicit Retry for `ServiceUnavailableException`, `ThrottlingException`, `InternalServerException` and `ModelTimeoutException` (4 attempts, backoff 2x).

## Human-in-the-Loop (Task Tokens)

1. `save-preview` runs with `IntegrationPattern.WAIT_FOR_TASK_TOKEN`: it persists the preview message with `task_token` + `task_token_status='pending'` and the state machine pauses.
2. The client renders Confirm/Cancel from the `preview_pending` WebSocket event.
3. `POST /chat/confirm` looks the token up (scoped to the owning user), updates the status FIRST (avoids double-resume races) and calls `SendTaskSuccess` with `{ confirmed }`.
4. The workflow resumes into the create-or-cancel branch.

## Environment Variables

| Variable                                                                 | Lambda(s)                      | Source                                                 |
| ------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `CHAT_STATE_MACHINE_ARN`                                                 | chat handler                   | LambdaChat stack (cross-version import)                |
| `APPSYNC_HTTP_DNS`, `APPSYNC_CHAT_NAMESPACE`                             | save-and-publish, save-preview | StepFunctionsChat stack (imports from AppSyncEvents)   |
| `DATABASE_URL`, `DATABASE_READONLY_URL`                                  | all task Lambdas               | stack props                                            |
| `EXPO_PUBLIC_APPSYNC_REALTIME_DNS`, `EXPO_PUBLIC_APPSYNC_CHAT_NAMESPACE` | client bundle                  | Amplify build env (written to `.env` by `amplify.yml`) |

All required variables are validated at Lambda init with `requireEnv` from `@packages/models/shared/utils/require-env` — a missing variable crashes with the variable name instead of running with a wrong default. Note: `userId` inside the workflow input is the **Cognito uid** (`users.uid`), not the DB `users.id`.

## Observability

- **Traces**: X-Ray end-to-end (API GW → handler → SFN → task Lambdas); `@trace` subsegments on repositories and outbound services; SFN client wrapped with `captureAWSv3Client`.
- **Metrics**: built-in Lambda/States/AppSync metrics plus EMF business counters under namespace `FinancialManagement` (`ChatExpenseCreated`, `ChatQueryExecuted`, `ChatAssistantMessagePublished`, `ChatPreviewRequested`).
- **Alarms**: per-Lambda errors/throttles, `ChatWorkflow-ExecutionsFailed`/`ExecutionsTimedOut` (AWS/States) and AppSync Events `5XXError`/`FailedEvents`. See `docs/observability-flow.md`.

## Local Testing

- Unit: `pnpm --filter @services/chat test` · prompts: `pnpm --filter @packages/prompts test`
- Integration (isolated schema, auto-created/dropped):
  `DATABASE_SCHEMA=financial_management TEST_RUN_ID=x pnpm test:integration` (inside `services/chat`, with `DATABASE_URL` set)
- Per-Lambda exec scripts in `services/chat/src/exec/` (`pnpm run:file src/exec/<name>.ts`), payloads overridable via env vars.
