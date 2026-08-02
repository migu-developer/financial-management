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
routes all five). It never calls Step Functions directly — the Lambda's IAM
role is the only principal allowed to start/resume the workflow. Every route is
authenticated with the **Cognito** authorizer.

| Method & Route                     | Purpose                                                                       | What it triggers                      |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `POST /chat`                       | Send a message (`{ content, sessionId?, attachmentS3Key?, attachmentType? }`) | **StartExecution** (new workflow run) |
| `POST /chat/upload-url`            | Presign an attachment upload (`{ contentType }`)                              | S3 presign only (no workflow)         |
| `POST /chat/confirm`               | Resolve a pending preview (`{ taskToken, confirmed }`)                        | **SendTaskSuccess** (resumes the run) |
| `GET /chat/sessions`               | List the user's sessions for the sidebar                                      | DB read (no workflow)                 |
| `GET /chat/sessions/{id}/messages` | Restore a conversation (oldest → newest)                                      | DB read (no workflow)                 |

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
  |-- HasImageAttachment? ........ Choice — only when attachmentType == "image"
  |     AnalyzeReceipt ........... λ fm-{stage}-chat-analyze-receipt (Textract AnalyzeExpense)
  |     ApplyReceiptText ......... Pass — overwrites $.content with caption + extracted fields
  |     (then falls into ClassifyIntent, exactly like a typed message)
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

| Component     | Resource                                                                                                            | Notes                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Chat handler  | `fm-{stage}-chat` (LambdaChat stack)                                                                                | Routes the 5 chat routes; only principal allowed to start/resume SF; presigns attachment uploads                      |
| State machine | `fm-{stage}-chat-process` (StepFunctionsChat stack)                                                                 | Standard; 8-day execution timeout (backstop); X-Ray; stage-aware logging (ALL dev / ERROR prod); catch-all error path |
| Task Lambdas  | `fm-{stage}-chat-{execute-query, validate-fields, create-expense, save-and-publish, save-preview, analyze-receipt}` | All Node.js 24 ESM. `analyze-receipt` carries NO database credentials — it only reads an image                        |
| Attachments   | `{assetsBucketPrefix}-{region}-chat-attachments` (ChatAttachments stack)                                            | Receipt photos; `PUT`-only CORS, 365-day expiry. See [Receipt attachments](#receipt-attachments-phase-2)              |
| Realtime API  | `fm-{stage}-chat-events` (AppSyncEvents stack)                                                                      | Cognito auth for clients, IAM SigV4 for backend                                                                       |
| Tables        | `chat_sessions`, `chat_messages` (migrations 4.0.0 + 4.1.0)                                                         | RLS + audit triggers; `task_token`/`task_token_status` drive HITL                                                     |

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

## Receipt attachments (Phase 2)

A user can photograph a receipt instead of typing the expense. The image is read
by **Amazon Textract `AnalyzeExpense`** and the result is spliced into the
message text _before_ intent classification, so the rest of the pipeline is
completely unaware that an attachment was involved.

### Upload path — the bytes never touch Lambda

```
Client
  |-- POST /chat/upload-url { contentType: "image/jpeg" }     (Cognito JWT)
  |     → { uploadUrl, s3Key, expiresIn: 300, attachmentType: "image" }
  |
  |-- PUT <uploadUrl>  (raw bytes, SAME Content-Type header)   → S3, direct
  |
  |-- POST /chat { content, attachmentS3Key: s3Key, attachmentType: "image" }
  v
(normal async workflow, now entering through HasImageAttachment?)
```

A phone photo is megabytes; API Gateway caps payloads at 10 MB and base64 would
inflate it further, so the upload is a **presigned S3 PUT** straight from the
device. `Content-Type` is part of the signature — the client MUST send the same
value it requested, or S3 rejects the PUT.

### Why the key is safe to trust on the way back

The client echoes `attachmentS3Key` back to us, which makes it untrusted input.
Two things make it safe:

1. **The server mints the key**, never the client:
   `chat-attachments/{userId}/{uuid}.{ext}`, where `userId` comes from the
   Cognito authorizer and the extension from an allow-list of MIME types.
2. **`AnalyzeReceiptUseCase` re-verifies ownership** from the key alone
   (`assertKeyOwnedBy`) before calling Textract: the key must sit directly under
   the caller's own prefix, with no `..` and no extra path segments. Without
   this, a caller could pass another user's key and read its contents into their
   own conversation.

### Workflow branch

| State                 | Type   | Behaviour                                                                                                                                                   |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HasImageAttachment?` | Choice | `isPresent($.attachmentS3Key)` **and** `isPresent($.attachmentType)` **and** `$.attachmentType == "image"` → branch; otherwise straight to `ClassifyIntent` |
| `AnalyzeReceipt`      | Task   | λ `fm-{stage}-chat-analyze-receipt` → Textract `AnalyzeExpense`                                                                                             |
| `ApplyReceiptText`    | Pass   | `inputPath: $.receipt.enrichedContent` → `resultPath: $.content`                                                                                            |

Both `isPresent` guards are load-bearing: a plain text message carries neither
key, and `stringEquals` against a **missing** path raises `States.Runtime`,
which would fail every text conversation.

`AnalyzeExpense` is the **synchronous** Textract API — it takes a single-page
image straight from S3 and returns labelled summary fields in one call, so the
state machine needs no polling loop.

### Degradation, not failure

A blurry or unreadable photo does **not** fail the execution. `AnalyzeReceipt`
returns `extracted: false` plus a note telling the model to ask the user for the
data, which lands the conversation in the ordinary clarification branch. Only a
broken _task_ (bad key, missing IAM, Textract outage) routes to the catch-all →
`PublishError` → `WorkflowFailed`.

Field normalization worth knowing about:

- **Amounts**: `.` and `,` swap roles between locales, so the decimal separator
  is inferred from the number's shape. A single separator with exactly 3
  trailing digits is treated as **thousands** — `$48.900` in es-CO is forty-eight
  thousand nine hundred, not 48.9.
- **Dates**: slashed dates are read **day-first** (`20/07/2026` → `2026-07-20`),
  matching the target locale. An unrecognized shape is dropped rather than
  guessed, so the model asks instead of inventing a date.
- **Confidence** is the _weakest_ per-field score among the fields actually
  kept, so one crisp field can't mask a barely-legible total.

### Storage

Attachments live in a **dedicated bucket** (`ChatAttachments`, v2), separate
from the v1 assets bucket: v1 is frozen once deployed, presigned PUTs from the
web build need a CORS policy that the email-templates bucket should not have,
and user content deserves its own lifecycle and least-privilege grants. A bucket
itself is free, so the split costs nothing.

| Setting    | Value                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| Name       | `{assetsBucketPrefix}-{region}-chat-attachments`                              |
| CORS       | `PUT` only, restricted to `ALLOWED_ORIGINS`                                   |
| Lifecycle  | → `STANDARD_IA` at 30 days, expire at 365 days, abort incomplete MPU at 1 day |
| Removal    | `RETAIN` (user content survives a stack teardown)                             |
| Versioning | Off — an attachment is written once and never updated                         |

The 365-day expiry is also the only cleanup path for **orphaned** uploads: an
object whose presigned PUT succeeded but whose `POST /chat` never followed (the
user cancelled) is referenced by no message row.

### IAM split

| Principal                         | Grant                                                                     |
| --------------------------------- | ------------------------------------------------------------------------- |
| `fm-{stage}-chat`                 | `s3:PutObject` on `chat-attachments/*` — signs uploads, cannot read       |
| `fm-{stage}-chat-analyze-receipt` | `s3:GetObject` on `chat-attachments/*` + `textract:AnalyzeExpense` on `*` |

`textract:AnalyzeExpense` cannot be resource-scoped — Textract exposes no
per-document ARN — so `*` is the only valid resource for that action.

### Audio is accepted by the schema but not yet wired

`chat_messages.attachment_type` allows `'audio'`, and an audio attachment is
persisted, but there is **no Transcribe branch yet**: the Choice sends it down
the ordinary text path so the caption is still processed. Adding voice notes
means a `StartTranscriptionJob` + `Wait`/`GetTranscriptionJob` polling loop
(Transcribe is asynchronous, unlike `AnalyzeExpense`).

## Environment Variables

| Variable                                                                 | Lambda(s)                      | Source                                                 |
| ------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `CHAT_STATE_MACHINE_ARN`                                                 | chat handler                   | LambdaChat stack (cross-version import)                |
| `CHAT_ATTACHMENTS_BUCKET`                                                | chat handler, analyze-receipt  | ChatAttachments stack (cross-version import)           |
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
  / `ChatUnknownIntent`, `ChatWorkflowError` (catch-all), `ChatPublishFailed`, and
  for attachments `ChatAttachmentUploadUrlIssued`, `ChatReceiptExtracted` /
  `ChatReceiptUnreadable` (the ratio between the last two is the signal for how
  well receipt reading is actually working).
- **Alarms**: per-Lambda errors; `ChatWorkflow-ExecutionsFailed`
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
  payloads overridable via env vars. For receipts, run `src/exec/upload-url.ts`
  first, `curl -X PUT` the printed URL with a real photo, then pass the key to
  `src/exec/sfn-analyze-receipt.ts` (Textract reads the object from S3, so a real
  upload is required).
- **Workflow tests (no deploy)** — see `infra/test/sfn-local/`:
  - `pnpm --filter @infra test:sfn-local` — runs the REAL ASL in Step Functions
    Local (Docker) with a MockConfigFile across every branch + the retry/catch
    paths; a completeness guard fails CI if a new `Task` state has no test case.
    Runs as the `sfn-local` job in `.github/workflows/ci.yml`. Test cases pick an
    execution input via a third field (`case:STATUS:image`) — `text` (default),
    `image` and `audio` — because the attachment branch is selected by the
    presence of `$.attachmentS3Key`/`$.attachmentType` in the input.
  - `pnpm --filter @infra test:sfn-teststate` — TestState API for single-state
    routing (DEV only, narrow IAM role).
