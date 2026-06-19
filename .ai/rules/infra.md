# Infrastructure Rules -- AWS CDK

## Scope

Applies to everything under `infra/`.

## Stack Versioning

Stacks are organized by version under `infra/lib/versions/`:

| Version | Purpose               | Examples                                                            |
| ------- | --------------------- | ------------------------------------------------------------------- |
| **v1**  | Foundation resources  | Cognito, S3 assets bucket                                           |
| **v2**  | Application resources | API Gateway, Lambda stacks, Step Functions, AppSync Events, Amplify |
| **v3**  | Observability         | Monitoring, alarms, dashboards                                      |

Each version directory has a `stacks.ts` that registers its stacks and an
`index.ts` that exports them.

## BaseStack Convention

All stacks MUST extend `BaseStack` (from `infra/lib/core/base-stack.ts`).

```typescript
export class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, { version, stackName, description });
    // ...
  }
}
```

`BaseStack` provides:

- Consistent naming: `FinancialManagement-{version}-{stackName}`
- Tags: `Version`, `Project`, `ManagedBy`
- Cross-version dependency resolution via `dependsOn` and
  `BaseStack.resolveDependencies()`.

## Cross-Version References

- Export values with `exportForCrossVersion(scope, outputKey, value, version, stackShortName)`.
- Import values with `importFromVersion(scope, fromVersion, stackShortName, outputKey)`.
- These produce stable CloudFormation export names:
  `FinancialManagement-{version}-{stackName}-{outputKey}`.

## Lambda Stack Conventions

- `functionName` MUST be explicit: `fm-{stage}-{service}`.
- `logGroup` with `RetentionDays.THREE_MONTHS`.
- `tracing: Tracing.ACTIVE` (X-Ray).
- `runtime: Runtime.NODEJS_24_X`.
- Bundling: `format: OutputFormat.ESM`, `sourceMap: true`, `minify: true`.
- Bundling environment: `{ npm_config_trust_policy: 'lenient' }`.
- ESM banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`.
- If the Lambda uses `@smithy/*` or `@aws-crypto/*` (e.g. SigV4 signing), set
  `externalModules: ['@aws-sdk/*']` explicitly — the CDK default also
  externalizes `@smithy/*`, which is NOT in the Lambda runtime and causes
  `Cannot find module '@smithy/...'` at runtime.

## Step Functions + Bedrock Conventions

- Build state machine definitions with CDK chainables
  (`DefinitionBody.fromChainable`) — no hand-written `asl.json` files.
- Prompt texts, model ids and inference settings come from
  `@packages/prompts` (`CHAT_BEDROCK_PROMPTS`) — NEVER inline them in stacks.
- Anthropic Claude models REQUIRE a cross-region **inference profile** ARN
  (`arn:aws:bedrock:{region}:{account}:inference-profile/us.anthropic...`).
  `FoundationModel.fromFoundationModelId` builds the wrong ARN shape — wrap
  manually and ALSO grant `bedrock:InvokeModel` on the underlying foundation
  model with a wildcard region (`arn:aws:bedrock:*::foundation-model/...`).
- EVERY `BedrockInvokeModel` state MUST have an explicit Retry for
  `Bedrock.ServiceUnavailableException`, `Bedrock.ThrottlingException`,
  `Bedrock.InternalServerException` and `Bedrock.ModelTimeoutException`
  (transient 503s otherwise kill the execution on the first attempt).
- Task Lambdas MUST retry transient infra errors (`Lambda.ServiceException`,
  `Lambda.AWSLambdaException`, `Lambda.SdkClientException`,
  `Lambda.TooManyRequestsException`) via a shared `addLambdaRetry` helper —
  EXCEPT non-idempotent tasks (e.g. expense creation), which must NOT be retried
  (a retry would duplicate the write); route their failures to the catch-all.
- EVERY fallible task MUST have a catch-all so the client never hangs:
  `.addCatch({ errors: ['States.ALL'], resultPath: '$.error' })` → a shared
  `PublishError` `LambdaInvoke` that publishes a STATIC user-facing error
  message (no Bedrock dependency) → a `Fail` state. The execution still ends
  `FAILED` (so alarms fire) but the user always gets a reply.
- Set an explicit `taskTimeout` on every task (e.g. Bedrock ~60s, Lambda ~40s)
  so a stalled integration can't pin a run open until the SM-level timeout.
- State-machine logging and log retention MUST be **stage-aware** for cost
  control: `LogLevel.ALL` in dev / `LogLevel.ERROR` in prod; shorter retention
  in dev (`ONE_MONTH`) than prod (`THREE_MONTHS`). The catch-all captures every
  failure, so prod loses no signal.
- Inject the current date with `$$.Execution.StartTime` (context object) —
  NEVER hardcode dates in ASL payloads or prompts.
- Use `Condition.stringMatches('$.x', 'VALUE*')` for LLM output dispatch
  (models append whitespace/punctuation that breaks `stringEquals`).
- New Lambdas MUST be added to the v3 monitoring `lambdaFunctions` map
  (drives both alarms and dashboard widgets); state machines get
  `ExecutionsFailed`/`ExecutionsTimedOut`/`ExecutionsAborted`/latency alarms,
  and chat health rolls up into the composite `Chat-Unhealthy` alarm.
- New states/branches MUST be covered by the Step Functions Local mock suite
  (`infra/test/sfn-local/`, run via `pnpm --filter @infra test:sfn-local` in the
  `sfn-local` CI job). A completeness guard fails CI if a `Task` state has no
  test case — add a `MockedResponse` + `TestCase` when you add a state.

## Deploy Order

- Use `dependsOn` in `BaseStackProps` to declare dependencies.
- Call `BaseStack.resolveDependencies(stackMap)` after all stacks are created.
- v2 stacks depend on v1 stacks (Cognito, S3).
- v3 stacks depend on v2 stacks (Lambdas).

## Commands

```bash
# Synth
cd infra && pnpm cdk synth

# Deploy a specific stack
cd infra && pnpm cdk deploy "FinancialManagement-v2-*"

# Diff
cd infra && pnpm cdk diff

# Test
pnpm --filter infra test

# Lint
pnpm --filter infra lint
```

## Constraints

- NEVER pass `env` (account/region) directly on stacks -- use
  `HostedZone.fromHostedZoneAttributes` or SSM parameters.
- NEVER create resources outside of a versioned stack directory.
- NEVER modify v1 stacks once deployed to production -- add new resources
  in v2 or v3.
- ALWAYS export outputs needed by other stacks via `exportForCrossVersion`.
- ALWAYS set explicit `functionName` on Lambdas to avoid CloudFormation
  drift on name changes.
