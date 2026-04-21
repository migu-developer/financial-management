# Infrastructure Rules -- AWS CDK

## Scope

Applies to everything under `infra/`.

## Stack Versioning

Stacks are organized by version under `infra/lib/versions/`:

| Version | Purpose               | Examples                            |
| ------- | --------------------- | ----------------------------------- |
| **v1**  | Foundation resources  | Cognito, S3 assets bucket           |
| **v2**  | Application resources | API Gateway, Lambda stacks, Amplify |
| **v3**  | Observability         | Monitoring, alarms, dashboards      |

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
- `runtime: Runtime.NODEJS_22_X`.
- Bundling: `format: OutputFormat.ESM`, `sourceMap: true`, `minify: true`.
- Bundling environment: `{ npm_config_trust_policy: 'lenient' }`.
- ESM banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`.

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
