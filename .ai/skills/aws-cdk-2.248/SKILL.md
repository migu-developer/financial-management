---
name: aws-cdk-2.248
description: |
  AWS CDK 2.248 patterns for infrastructure-as-code with TypeScript.
  TRIGGER when: creating or editing CDK stacks, defining Lambda functions,
  configuring AWS resources, or working in the infra/ directory.
metadata:
  version: '2.248.0'
  catalog_ref: 'aws-cdk-lib: ^2.248.0'
  scope: [infra]
  auto_invoke: 'When writing CDK infrastructure code or Lambda configurations'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# AWS CDK 2.248

## Version

aws-cdk-lib@2.248.0 (from pnpm catalog), constructs@10.6.0

## Critical Patterns

- Use `aws-cdk-lib` (single package) -- not individual `@aws-cdk/*` packages
- Use `NodejsFunction` for Lambda functions with automatic TypeScript bundling via esbuild
- Use `logGroup` property on Lambda (not `logRetention` which is deprecated)
- Use `Tracing.ACTIVE` on Lambda functions for X-Ray tracing
- Use `Duration.seconds()`, `Duration.minutes()` for timeouts (not raw numbers)
- Use `RemovalPolicy.RETAIN` for production databases and stateful resources
- Use `RemovalPolicy.DESTROY` only for dev/test stacks
- Use `bundling.format: OutputFormat.ESM` for ESM Lambda output
- Define resources per stage (dev/staging/prod) using stack props
- Use path aliases in `moduleNameMapper` for tests (ts-jest with jest 29 in infra)
- Lock file (pnpm-lock.yaml) is required for NodejsFunction bundling

## Must NOT Do

- NEVER use `logRetention` on Lambda -- it is deprecated; use `logGroup` with `logs.LogGroup`
- NEVER use raw number values for Duration -- use `Duration.seconds()`, etc.
- NEVER hardcode account IDs or region -- use `Stack.of(this).account` and `Stack.of(this).region`
- NEVER use `RemovalPolicy.DESTROY` on production stateful resources
- NEVER import from `@aws-cdk/aws-*` (v1 packages) -- use `aws-cdk-lib/aws-*`
- NEVER skip `environment` configuration on Lambda for service name and stage
- NEVER use `Code.fromAsset` for TypeScript Lambdas -- use `NodejsFunction`

## Examples

### NodejsFunction with proper configuration

```typescript
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

const logGroup = new logs.LogGroup(this, 'FnLogGroup', {
  logGroupName: `/aws/lambda/${stage}-users-handler`,
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy:
    stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
});

const handler = new NodejsFunction(this, 'UsersHandler', {
  entry: 'src/handlers/users.ts',
  handler: 'handler',
  runtime: Runtime.NODEJS_22_X,
  timeout: Duration.seconds(30),
  memorySize: 256,
  tracing: Tracing.ACTIVE,
  logGroup,
  environment: {
    SERVICE_NAME: 'users',
    STAGE: stage,
    LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
  },
  bundling: {
    format: OutputFormat.ESM,
    mainFields: ['module', 'main'],
    minify: true,
    sourceMap: true,
    externalModules: ['@aws-sdk/*'],
  },
});
```

### Stack definition with stage-aware props

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface ServiceStackProps extends StackProps {
  stage: string;
}

export class UsersServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    const { stage } = props;
    // Resources here use stage for naming and configuration
  }
}
```

### Alarm pattern (stage-aware)

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
  metric: handler.metricErrors({ period: Duration.minutes(5) }),
  threshold: stage === 'prod' ? 1 : 5,
  evaluationPeriods: 2,
  alarmDescription: `${stage} users handler error rate`,
});
```

### API Gateway integration

```typescript
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const api = new apigateway.RestApi(this, 'UsersApi', {
  restApiName: `${stage}-users-api`,
  deployOptions: { stageName: stage },
});

const usersResource = api.root.addResource('users');
usersResource.addMethod('GET', new apigateway.LambdaIntegration(handler));
```
