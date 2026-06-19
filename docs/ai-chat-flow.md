# AI Chat — Conversational Expense Flow

## Overview

The AI Chat lets users register and query expenses in natural language
("Pagué 80000 pesos colombianos de mercado ayer", "¿Cuánto gasté este mes?").
Everything is **asynchronous** (Serverlesspresso pattern): the client gets an
immediate ACK, an AWS Step Functions Standard workflow processes the message in
the background invoking Amazon Bedrock directly, and the answer arrives in real
time over an AppSync Events WebSocket. Expense creation requires explicit user
confirmation (**Human-in-the-Loop** via Task Tokens).

The conversation is **session-based and persistent**: the last session is
restored on reload, past sessions are listed, and a long-lived preview can
wait days for the user's decision without losing the thread.

Deployed per environment in its own AWS account/region (dev and prod live in
different regions); everything below uses `{stage}`/`{region}`/`{account}`
placeholders and is region-portable by design (see Bedrock routing).

## Request Surface (API Gateway)

The client only ever talks to **API Gateway** (one Lambda, `fm-{stage}-chat`,
routes all four). It never calls Step Functions directly — the Lambda's IAM
role is the only principal allowed to start/resume the workflow. Every route is
authenticated with the **Cognito** authorizer.

| Method & Route                     | Purpose                                                | What it triggers                      |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| `POST /chat`                       | Send a message (`{ content, sessionId? }`)             | **StartExecution** (new workflow run) |
| `POST /chat/confirm`               | Resolve a pending preview (`{ taskToken, confirmed }`) | **SendTaskSuccess** (resumes the run) |
| `GET /chat/sessions`               | List the user's sessions for the sidebar               | DB read (no workflow)                 |
| `GET /chat/sessions/{id}/messages` | Restore a conversation (oldest → newest)               | DB read (no workflow)                 |

## Request Flow

```
Client (AI Chat Drawer — dashboard AND expenses views)
  |
  |-- POST /chat { content, sessionId? }              (Cognito JWT)
  v
API Gateway → Lambda fm-{stage}-chat
  |-- supersedes any still-pending preview in the session (see HITL)
  |-- persists user message (chat_messages)
  |-- StartExecution on fm-{stage}-chat-process (async, name = messageId)
  |-- returns { status: "processing" } immediately (HTTP 202)
  v
Step Function "ChatProcess" (Standard):
  |
  |-- ClassifyIntent ............. Bedrock Nova Micro → QUERY | CREATE | UNKNOWN
  |
  |-- QUERY branch:
  |     ExtractSqlParams ......... Nova Lite (current date via $$.Execution.StartTime)
  |     ExecuteQuery ............. λ fm-{stage}-chat-execute-query (existing expense repos)
  |     GenerateQueryNL .......... Claude Haiku (user-facing answer)
  |     SaveQueryAnswer .......... λ save-and-publish
  |
  |-- CREATE branch:
  |     ExtractExpenseFields ..... Nova Lite
  |     ValidateFields ........... λ validate-fields (catalog name → id + human `display`)
  |     ├─ incomplete → GenerateClarification (Haiku) → save-and-publish
  |     └─ complete:
  |          GeneratePreview ..... Haiku (reads the human `display`, "...¿Confirmás?")
  |          WaitForConfirmation . λ save-preview (.waitForTaskToken — SF PAUSES, up to 7 days)
  |            → client shows [Confirmar] [Cancelar]
  |            → POST /chat/confirm { taskToken, confirmed } → SendTaskSuccess
  |          Confirmed? (Choice):
  |            ├─ superseded → PreviewSuperseded (Succeed, silent — user iterated)
  |            ├─ confirmed  → CreateExpense (λ) → GenerateConfirmation → save-and-publish
  |            └─ cancelled  → GenerateCancellation → save-and-publish
  |          (States.Timeout after 7 days) → PreviewExpired (Succeed, silent)
  |
  |-- UNKNOWN → GenerateUnknown (Haiku) → save-and-publish
  |
  |-- ON ANY UNHANDLED ERROR (retries exhausted / Lambda or Bedrock failure):
  |     catch-all (States.ALL) → PublishError (static friendly message,
  |       eventKind:'error', no Bedrock) → Fail (ChatWorkflowError)
  v
AppSync Events (SigV4 publish to chat/{userId}/responses)
  v
Client WebSocket → message rendered in the drawer
```

## How the state machine is triggered

Two distinct triggers, both from the same `fm-{stage}-chat` Lambda (shared,
X-Ray-instrumented Step Functions client):

1. **New message → `StartExecution`.** `POST /chat` runs the send-message use
   case (resolve session → supersede pending previews → persist message →
   `StartExecution`). The execution `name` is the message id (one run per
   message, idempotent). Standard workflows don't block, so the endpoint ACKs
   in ~100 ms; the answer is delivered later over the WebSocket. IAM:
   `states:StartExecution` scoped to the chat state-machine ARN.

2. **Decision → `SendTaskSuccess` (resume, NOT a new run).** While paused at
   `WaitForConfirmation`, the run holds a task token (persisted on the preview
   message). `POST /chat/confirm` updates the DB status **first** (atomic guard
   against a double-resume) and then calls
   `SendTaskSuccess(taskToken, { confirmed })`, which resumes the same paused
   execution into the create-or-cancel branch. IAM:
   `states:SendTaskSuccess`/`SendTaskFailure` on resource `*` (task tokens are
   not ARNs).

## Components

| Component     | Resource                                                                                           | Notes                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Chat handler  | `fm-{stage}-chat` (LambdaChat stack)                                                               | Routes the 4 chat routes; only principal allowed to start/resume SF                                                   |
| State machine | `fm-{stage}-chat-process` (StepFunctionsChat stack)                                                | Standard; 8-day execution timeout (backstop); X-Ray; stage-aware logging (ALL dev / ERROR prod); catch-all error path |
| Task Lambdas  | `fm-{stage}-chat-{execute-query, validate-fields, create-expense, save-and-publish, save-preview}` | All Node.js 24 ESM                                                                                                    |
| Realtime API  | `fm-{stage}-chat-events` (AppSyncEvents stack)                                                     | Cognito auth for clients, IAM SigV4 for backend                                                                       |
| Tables        | `chat_sessions`, `chat_messages` (migrations 4.0.0 + 4.1.0)                                        | RLS + audit triggers; `task_token`/`task_token_status` drive HITL                                                     |

## Bedrock Model Routing (2-tier)

All prompt texts, model ids and inference settings live in **`@packages/prompts`**
(single source of truth consumed by `services/chat` AND the CDK stack at synth
time — see `CHAT_BEDROCK_PROMPTS`). Changing a prompt requires redeploying the
StepFunctionsChat stack (the ASL embeds the text at synth).

| Task                   | Model (cross-region inference profile) | Why                                                |
| ---------------------- | -------------------------------------- | -------------------------------------------------- |
| Intent classification  | `us.amazon.nova-micro-v1:0`            | Cheap, deterministic, one-word output              |
| Param/field extraction | `us.amazon.nova-lite-v1:0`             | Structured JSON (parsed with `parseBedrockJson()`) |
| User-facing responses  | `us.anthropic.claude-haiku-4-5-…`      | Quality matters; better Spanish than Nova          |

**Every model is invoked through its `us.` cross-region inference profile**, not
the bare on-demand model id. On-demand invocation isn't available in every
region (e.g. Nova requires a profile in us-east-2), so the profile keeps the
workflow portable across regions. The state-machine role is granted
`bedrock:InvokeModel` on each underlying foundation model, **scoped to the
profile's fan-out regions** (us-east-1 / us-east-2 / us-west-2) — least
privilege, no region wildcard. CDK builds the profile ARN by hand
(`arn:aws:bedrock:{region}:{account}:inference-profile/{profileId}`);
`FoundationModel.fromFoundationModelId` produces the wrong ARN shape.

All Bedrock states have explicit Retry for `ServiceUnavailableException`,
`ThrottlingException`, `InternalServerException` and `ModelTimeoutException`
(4 attempts, 2× backoff) so a transient 503 doesn't kill the run. Task Lambdas
have their own infra-error retries and every task routes to a catch-all on
failure — see [Error handling & resilience](#error-handling--resilience-never-leave-the-client-hanging).

### Response quality guards

User-facing prompts (Claude Haiku) carry generous `maxTokens` headroom
(clarification 256, preview 220, unknown 200, confirmation 150) and explicit
instructions to be concise and **always finish the message** — so replies are
never cut off mid-word. Preview/confirmation are fed a **human-readable
`display` object** (currency CODE, type as ingreso/egreso, category NAME) and
are told to **never emit internal identifiers** — the user never sees a catalog
UUID. The chat persona is consistent rioplatense voseo.

## Human-in-the-Loop (Task Tokens)

1. `save-preview` runs with `IntegrationPattern.WAIT_FOR_TASK_TOKEN`: it
   persists the preview message with `task_token` + `task_token_status='pending'`
   and the state machine pauses.
2. The client renders Confirm/Cancel from the `preview_pending` WebSocket event.
3. `POST /chat/confirm` looks the token up (scoped to the owning user), updates
   the status FIRST (avoids double-resume races) and calls `SendTaskSuccess`
   with `{ confirmed }`. The workflow resumes into create-or-cancel.

`task_token_status` lifecycle: `pending → confirmed | cancelled | expired |
superseded`.

- **Long wait window.** The HITL task waits up to **7 days** (the execution has
  an 8-day backstop). Standard Step Functions bills per state transition, not
  per wait time, so a paused run costs nothing while it waits. If the 7 days
  elapse, the task raises `States.Timeout`, which is **caught** and ends the
  execution cleanly (`PreviewExpired` Succeed) — no error, no alarm.
- **Iterating on a preview (supersede).** If the user sends a new message
  instead of confirming, the send-message use case marks the pending preview
  `superseded` and resumes its paused run with `{ superseded: true }`, which the
  Choice routes to a silent `PreviewSuperseded` Succeed (no expense, no
  publish). A fresh run starts for the new message. The client only ever shows
  the Confirm/Cancel of the **latest** preview.
- **Stale confirm.** If a token is already gone (expired wait), `/chat/confirm`
  reconciles the row to `expired` and returns a clean "preview expired" error
  instead of a 500. No expense is ever created from a dead token.

## Error handling & resilience (never leave the client hanging)

Two layers keep a failure from stranding the user on the typing indicator:

1. **Retries (automatic, in-execution).** Every Bedrock state retries
   `ServiceUnavailable`/`Throttling`/`InternalServer`/`ModelTimeout` (4 attempts,
   2× backoff). Every task Lambda retries transient infra errors
   (`Lambda.ServiceException`, `AWSLambdaException`, `SdkClientException`,
   `TooManyRequestsException`; 3 attempts) via an `addLambdaRetry` helper —
   **except `CreateExpense`**, which is not idempotent (a retry could duplicate
   the expense), so its failures go straight to the catch-all.
2. **Catch-all (in-execution).** Every fallible task has
   `.addCatch({ errors: ['States.ALL'] })` → **`PublishError`** (a `LambdaInvoke`
   that calls `save-and-publish` with a STATIC friendly message and
   `eventKind:'error'` — no Bedrock dependency, since that's what may have
   failed) → **`Fail`** (`ChatWorkflowError`). The user always gets a reply; the
   execution still ends `FAILED` so it stays visible to alarms.

Other guards: explicit `taskTimeout` on every task (Bedrock 60s, Lambda 40s;
`WaitForConfirmation` keeps its 7-day HITL timeout plus a `States.ALL` catch);
`tryParseBedrockJson` degrades malformed model output to a clarification/generic
query instead of throwing; the `messageId` is threaded into every task payload
for trace correlation. Residual gap: if `PublishError` itself fails (AppSync
down after its retries) no event reaches the client — a client-side
"still working…" timeout is the planned mitigation.

## Sessions & continuity

- The drawer **restores the last session** on open/reload (the active session
  id is persisted client-side, per user) and rehydrates its messages from
  `GET /chat/sessions/{id}/messages` — including re-showing a still-pending
  preview's Confirm/Cancel.
- A **sessions list** (newest activity first, with a first-message preview as
  title) lets the user switch conversations; a **"New chat"** action starts a
  fresh one. No time-based expiry — sessions persist until explicitly replaced.
- The drawer is available on **both the dashboard and the expenses views**
  (same `ChatProvider`, mounted once at the dashboard layout).

## Realtime delivery

- The client subscribes over the AppSync Events WebSocket while the drawer is
  open and renders incoming events as messages.
- **Per-session filtering**: the channel carries events for all of the user's
  sessions, so an event is rendered only when it matches the active session
  (tracked synchronously), keeping background sessions from leaking in.
- **Auto-reconnect**: long-lived sessions outlive a single socket (network
  blips, idle timeouts, token expiry). The client reconnects with exponential
  backoff and a **fresh token**, re-subscribes, and an idle watchdog forces a
  reconnect if keep-alives stop. On reconnect it **backfills** the active
  session from the DB (Events doesn't replay messages missed while offline), so
  the user never has to reload to see a reply.

## Environment Variables

| Variable                                                                 | Lambda(s)                      | Source                                                 |
| ------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `CHAT_STATE_MACHINE_ARN`                                                 | chat handler                   | LambdaChat stack (cross-version import)                |
| `APPSYNC_HTTP_DNS`, `APPSYNC_CHAT_NAMESPACE`                             | save-and-publish, save-preview | StepFunctionsChat stack (imports from AppSyncEvents)   |
| `DATABASE_URL`, `DATABASE_READONLY_URL`                                  | all task Lambdas               | stack props                                            |
| `EXPO_PUBLIC_APPSYNC_REALTIME_DNS`, `EXPO_PUBLIC_APPSYNC_CHAT_NAMESPACE` | client bundle                  | Amplify build env (written to `.env` by `amplify.yml`) |

All required variables are validated at Lambda init with `requireEnv` from
`@packages/models/shared/utils/require-env` — a missing variable crashes with
the variable name instead of running with a wrong default. Note: `userId`
inside the workflow input is the **Cognito uid** (`users.uid`), not the DB
`users.id`.

## Observability

- **Traces**: X-Ray end-to-end (API GW → handler → SFN → task Lambdas);
  `@trace` subsegments on repositories and outbound services; SFN client wrapped
  with `captureAWSv3Client`. Task handlers annotate `userId`/`sessionId`/`messageId`
  so all spans of one conversation turn can be filtered by `messageId` (= the SFN
  execution name). The AppSync publish is a **named `AppSyncEvents` remote
  subsegment** (`TracerServiceImplementation.traceRemote`) instead of a raw DNS
  host. A Step Function has no single selectable trace — open a run's trace from
  the SFN console → execution → "Trace".
- **Metrics**: built-in Lambda/States/AppSync metrics plus EMF business counters
  under namespace `FinancialManagement` (dim `service=chat`): `ChatMessageReceived`,
  `ChatWorkflowStartFailure`, `ChatPreviewSuperseded`, `ChatQueryExecuted`,
  `ChatMalformedModelJson`, `ChatPreviewRequested`, `ChatExpenseCreated`,
  `ChatAssistantMessagePublished`, per-branch `ChatQueryAnswerSent` /
  `ChatExpenseConfirmationSent` / `ChatExpenseCancelled` / `ChatClarificationSent`
  / `ChatUnknownIntent`, `ChatWorkflowError` (catch-all), and `ChatPublishFailed`.
- **Alarms**: per-Lambda errors/throttles; `ChatWorkflow-ExecutionsFailed`
  (thresholded — >2 in 2 of 3 windows, since the catch-all already replies to the
  user on a single failure), `ChatWorkflow-ExecutionsTimedOut`,
  `ChatWorkflow-ExecutionsAborted`, `ChatWorkflow-LatencyP90High` (p90 > 60s),
  `Chat-PublishFailed`, AppSync Events `5XXError`/`FailedEvents`, and a **composite
  `Chat-Unhealthy`** that ORs them into one actionable page. A dashboard section
  graphs the EMF business metrics. See `docs/observability-flow.md`.

## Local Testing

- Unit: `pnpm --filter @services/chat test` · prompts: `pnpm --filter @packages/prompts test`
- Integration (isolated schema, auto-created/dropped):
  `DATABASE_SCHEMA=financial_management TEST_RUN_ID=x pnpm test:integration`
  (inside `services/chat`, with `DATABASE_URL` set)
- Per-Lambda exec scripts in `services/chat/src/exec/` (`pnpm run:file src/exec/<name>.ts`),
  payloads overridable via env vars.
- **Workflow tests (no deploy)** — see `infra/test/sfn-local/`:
  - `pnpm --filter @infra test:sfn-local` — runs the REAL ASL in Step Functions
    Local (Docker) with a MockConfigFile across every branch + the retry/catch
    paths; a completeness guard fails CI if a new `Task` state has no test case.
    Runs as the `sfn-local` job in `.github/workflows/ci.yml`.
  - `pnpm --filter @infra test:sfn-teststate` — TestState API for single-state
    routing (DEV only, narrow IAM role).
