---
name: powertools-2.32
description: |
  AWS Lambda Powertools 2.32 for structured logging and X-Ray tracing.
  TRIGGER when: adding logging or tracing to Lambda handlers,
  using the @trace decorator, or configuring observability.
metadata:
  version: '2.32.0'
  catalog_ref: '@aws-lambda-powertools/logger: ^2.32.0'
  scope: [services, packages]
  auto_invoke: 'When adding logging, tracing, or observability to Lambda functions'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# Lambda Powertools 2.32

## Version

@aws-lambda-powertools/logger@2.32.0, @aws-lambda-powertools/tracer@2.32.0 (from pnpm catalog)

## Critical Patterns

- Use `Logger` for structured JSON logging (not `console.log`)
- Use the native `@trace('SegmentName')` decorator from `@services/shared/infrastructure/decorators/trace`
  for method-level X-Ray tracing. Do NOT use `@tracer.captureMethod()` from Powertools.
- Use `TracerServiceImplementation` in handlers for handler-level tracing (`annotateColdStart`, `putAnnotation`)
- Set `serviceName` on Logger -- matches the CDK function name
- Logger automatically includes cold start annotation
- Set `LOG_LEVEL` and `POWERTOOLS_SERVICE_NAME` as Lambda environment variables
- Do NOT use `experimentalDecorators` in tsconfig -- the project uses Stage 3 decorators

## Tracing Architecture

- **Handler level**: `TracerServiceImplementation` from `@services/shared` for annotations and cold start
- **Method level**: `@trace('Name')` decorator for X-Ray subsegments on repository and service methods
- The `@trace` decorator uses Powertools Tracer internally but with Stage 3 decorator syntax
- When no X-Ray segment is active (local dev, tests), `@trace` is a no-op

## Must NOT Do

- NEVER use `console.log` -- use Logger for structured output
- NEVER use `@tracer.captureMethod()` -- use `@trace('SegmentName')` instead
- NEVER enable `experimentalDecorators` in tsconfig -- the project uses Stage 3 decorators
- NEVER create Logger/Tracer instances inside the handler -- create at module level
- NEVER log sensitive data (passwords, tokens, PII)
- NEVER use Tracer without `Tracing.ACTIVE` on the Lambda function in CDK

## Examples

### Handler tracing (handler-level, in handlers/\*.ts)

```typescript
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';

const tracerService = new TracerServiceImplementation('my-service');

export const handler = async (event: APIGatewayProxyEvent) => {
  tracerService.annotateColdStart();
  tracerService.putAnnotation('httpMethod', event.httpMethod);
  // ...
};
```

### Method tracing (repository/service level)

```typescript
import { trace } from '@services/shared/infrastructure/decorators/trace';

class UserRepository {
  @trace('User:findByUid')
  async findByUid(uid: string): Promise<User | null> {
    return this.dbService.queryReadOnly<User>(...);
  }

  @trace('User:create')
  async create(input: CreateUserInput): Promise<User> {
    return this.dbService.query<User>(...);
  }
}
```

### Logger setup (module level)

```typescript
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const logger = new LoggerServiceImplementation('my-service');
logger.info('Processing request', { path: event.path });
logger.error('Request failed', { error });
```
