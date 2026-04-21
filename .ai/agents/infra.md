# Infrastructure Agent Instructions

## Scope

AWS CDK infrastructure under `infra/`. Includes `lib/core/`, `lib/config/`,
`lib/utils/`, and `lib/versions/` (v1, v2, v3).

## Commands

```bash
cd infra && pnpm cdk synth               # Synthesize CloudFormation
cd infra && pnpm cdk diff                 # Show pending changes
cd infra && pnpm cdk deploy "Pattern-*"   # Deploy matching stacks
pnpm --filter infra test                  # Unit tests
pnpm --filter infra lint                  # Lint
pnpm --filter infra typecheck             # Type-check
```

## Patterns

### Stack Versioning

- v1: Foundation (Cognito, S3 assets bucket).
- v2: Application (API Gateway, Lambda stacks, Amplify hosting).
- v3: Observability (monitoring, alarms, dashboards).

### BaseStack

All stacks extend `BaseStack`. Naming: `FinancialManagement-{version}-{stackName}`.
Tags: `Version`, `Project`, `ManagedBy`.

### Cross-Version References

- `exportForCrossVersion(scope, outputKey, value, version, stackShortName)`.
- `importFromVersion(scope, fromVersion, stackShortName, outputKey)`.
- Export name format: `FinancialManagement-{version}-{stackName}-{outputKey}`.

### Lambda Conventions

- `functionName`: `fm-{stage}-{service}` (always explicit).
- `logGroup`: `RetentionDays.THREE_MONTHS`.
- `runtime`: `Runtime.NODEJS_22_X`.
- `tracing`: `Tracing.ACTIVE`.
- Bundling: ESM format, source maps, minify.
- Bundling env: `{ npm_config_trust_policy: 'lenient' }`.

### Dependency Resolution

- Declare `dependsOn` in `BaseStackProps`.
- Call `BaseStack.resolveDependencies(stackMap)` after all stacks created.

## Constraints

- NEVER pass `env` (account/region) directly on stacks.
- NEVER create resources outside versioned stack directories.
- NEVER modify v1 stacks after production deployment.
- ALWAYS export outputs via `exportForCrossVersion`.
- ALWAYS set explicit `functionName` on Lambdas.
- ALWAYS write tests for new stacks (co-located `.test.ts` files).

## Dependencies

- `aws-cdk-lib: ^2.248.0`, `constructs: ^10.6.0`
- `esbuild: ^0.27.3` (for Lambda bundling)
- `@packages/config` (shared lint/TS config)
