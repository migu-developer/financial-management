# Infrastructure (AWS CDK) - Financial Management

Project of infrastructure as code with AWS CDK, organized by **versions** to control which stacks are deployed in each iteration.

## Estructura versionada de stacks

```
infra/
├── bin/
│   └── infra.ts              # Entry point: read context version/stacks and instantiate stacks
├── lib/
│   ├── config/
│   │   └── versions.ts       # Register version → stacks (import from versions/vX)
│   ├── core/
│   │   └── base-stack.ts     # Base stack with tags and versioned name
│   ├── utils/
│   │   ├── types.ts          # StackFactory, NamedStackFactory, StackDeps
│   │   └── cross-version.ts  # exportForCrossVersion / importFromVersion (v1↔v2)
│   └── versions/
│       ├── deploy-version.ts # Set DEPLOY_VERSION here to choose which version to deploy
│       ├── v1/
│       │   ├── index.ts      # List of stacks of version 1
│       │   └── *.ts          # Stacks (Placeholder, DependentPlaceholder, …)
│       └── v2/
│           ├── index.ts      # Stacks of version 2
│           └── *.ts          # e.g. ConsumerFromV1 (imports from v1)
├── cdk.json
└── package.json
```

- **Version to deploy**: set in `lib/versions/deploy-version.ts` (`DEPLOY_VERSION = 'v1'` or `'v2'`). Then run `pnpm run deploy` or `pnpm cdk synth`. No CLI params needed.
- **Stacks by version**: each `lib/versions/vX/index.ts` exports the list of stacks; `lib/config/versions.ts` maps version → stacks.
- **Optional filter**: `--context stacks=Placeholder,Networking` limits which stacks are instantiated (by short name).

## Useful commands

```bash
# 1. Choose version: edit lib/versions/deploy-config.ts and set DEPLOY_VERSION = 'v1' or 'v2'
# 2. Then:

pnpm build
pnpm cdk bootstrap  # bootstrap the account and region
pnpm cdk synth      # synthesize the version set in deploy-version.ts
pnpm cdk deploy     # deploy all stacks of that version
pnpm cdk list       # list stacks of that version
pnpm cdk diff       # diff deployed vs current


# Filter by stack short names (version comes from lib/versions/deploy-config.ts)
# Use the same names as in lib/versions/vX/index.ts (name field), e.g. for v1: Placeholder, DependentPlaceholder
pnpm cdk synth --context stacks=Placeholder,DependentPlaceholder

# Deploy only those stacks (by short name)
pnpm cdk deploy --context stacks=Placeholder,DependentPlaceholder
```

## Add a new stack

1. Create the stack class in `lib/versions/vX/` (extending `BaseStack` from `lib/core/base-stack.ts`).
2. In `lib/versions/vX/index.ts`, register the stack in the array (with `name` and `create`).
3. If it is a new version, create `lib/versions/vY/` and register the version in `lib/config/versions.ts`.

## Example: dependencies in this repo

- **v1 Placeholder** (`lib/versions/v1/placeholder-stack.ts`): exposes `exampleValue` for same-version use and calls `exportForCrossVersion(..., 'PlaceholderId', ...)` so v2 can import it.
- **v1 DependentPlaceholder** (`lib/versions/v1/dependent-placeholder-stack.ts`): uses `deps.getStack('Placeholder')` and reads `(placeholder as PlaceholderStack).exampleValue` (same-version dependency). Registered after Placeholder in `v1/index.ts`.
- **v2 ConsumerFromV1** (`lib/versions/v2/consumer-from-v1-stack.ts`): uses `importFromVersion(this, 'v1', 'Placeholder', 'PlaceholderId')` to consume the value exported by v1 Placeholder (cross-version). Deploy v1 first, then set `DEPLOY_VERSION = 'v2'` and deploy v2.

## Stack dependencies

### Same version (e.g. v1 stack depends on another v1 stack)

Stacks receive a `deps` object with `getStack(shortName)`. **Order in `versions/vX/index.ts` matters**: put a stack after the stacks it depends on. CDK will create the dependency between stacks when you use references from the other stack.

```ts
// lib/versions/v2/index.ts – Compute after Networking so it can use deps.getStack('Networking')
const createComputeStack: NamedStackFactory = {
  name: 'Compute',
  create: (scope, version, deps) => {
    const networking = deps.getStack('Networking');
    if (!networking) throw new Error('Networking stack required');
    return new ComputeStack(scope, 'ComputeStack', version, networking);
  },
};
```

### Cross-version (v2 stack depends on output of a v1 stack)

When a v2 stack needs an output from an **already-deployed** v1 stack:

1. **In the v1 stack** that provides the value: export it with a stable name using `exportForCrossVersion` from `@utils/cross-version`.

```ts
import { exportForCrossVersion } from '@utils/cross-version';

// Inside your v1 Networking stack constructor:
exportForCrossVersion(this, 'VpcId', this.vpc.vpcId, 'v1', 'Networking');
```

2. **In the v2 stack** that consumes it: import the value with `importFromVersion`.

```ts
import { importFromVersion } from '@utils/cross-version';

// Inside your v2 stack (e.g. Compute):
const vpcId = importFromVersion(this, 'v1', 'Networking', 'VpcId');
// Use vpcId in CfnResource or similar; deploy v1 first, then v2.
```

Export names follow: `FinancialManagement-{version}-{stackName}-{outputKey}`.

## Best practices

- Use **tags** (already applied in `BaseStack`): `Version`, `Project`, `ManagedBy`.
- Maintain stacks **atomic** by domain (networking, compute, data, etc.).
- Document each `versions/vX/index.ts` what includes that version for audit and rollback.
- In CI/CD, set the version by updating `lib/versions/deploy-version.ts` (e.g. from a pipeline variable or by checking out a branch that has the desired `DEPLOY_VERSION`), then run `pnpm run deploy`.
