---
name: powertools-2.32
description: |
  AWS Lambda Powertools 2.32 for structured logging and tracing.
  TRIGGER when: adding logging or tracing to Lambda handlers,
  using @captureMethod decorator, or configuring observability.
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
- Use `Tracer` with `@captureMethod` decorator for method-level X-Ray tracing
- Use `captureAWSv3Client()` to instrument AWS SDK v3 clients
- Set `serviceName` on both Logger and Tracer -- matches the CDK service name
- Logger automatically includes cold start annotation
- Use `injectLambdaContext` middleware to inject Lambda context into all logs
- Use `captureLambdaHandler` middleware for automatic tracing of handler
- Import middlewares from subpath: `@aws-lambda-powertools/logger/middleware`
- Enable `experimentalDecorators: true` in tsconfig.json for `@captureMethod`
- Set `LOG_LEVEL` and `POWERTOOLS_SERVICE_NAME` as Lambda environment variables

## Must NOT Do

- NEVER use `console.log` -- use Logger for structured output
- NEVER use `console.error` -- use `logger.error()` with error object
- NEVER create Logger/Tracer instances inside the handler -- create at module level
- NEVER forget to set `serviceName` -- it is required for log correlation
- NEVER log sensitive data (passwords, tokens, PII) -- use `logger.removeKeys()`
- NEVER skip `experimentalDecorators` in tsconfig when using `@captureMethod`
- NEVER use Tracer without `Tracing.ACTIVE` on the Lambda function in CDK

## tsconfig requirement

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Examples

### Logger and Tracer setup (module level)

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

const logger = new Logger({ serviceName: 'users' });
const tracer = new Tracer({ serviceName: 'users' });
```

### Handler with middleware (Middy)

```typescript
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';

const lambdaHandler = async (event: APIGatewayProxyEventV2) => {
  logger.info('Processing request', { path: event.rawPath });

  try {
    const result = await processRequest(event);
    logger.info('Request processed', { statusCode: 200 });
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    logger.error('Request failed', error as Error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal error' }),
    };
  }
};

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer));
```

### Class-based service with @captureMethod

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'users' });

class UserService {
  @tracer.captureMethod()
  async getUser(id: string): Promise<User> {
    logger.info('Fetching user', { userId: id });
    // ... database call
    return user;
  }

  @tracer.captureMethod()
  async createUser(data: CreateUserInput): Promise<User> {
    logger.info('Creating user', { email: data.email });
    // ... database call
    return newUser;
  }
}
```

### Instrument AWS SDK v3 clients

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = tracer.captureAWSv3Client(new S3Client({}));
```

### Structured error logging

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    userId,
    operation: 'createExpense',
  });
  throw error;
}
```

### Appending persistent keys

```typescript
// Add keys that persist across all log entries in this invocation
logger.appendKeys({
  tenantId: event.requestContext.authorizer?.tenantId,
  requestId: event.requestContext.requestId,
});
```

### Cold start annotation (automatic)

Logger automatically logs `"coldStart": true` on the first invocation.
No manual configuration needed.

### CDK environment variables for Powertools

```typescript
environment: {
  POWERTOOLS_SERVICE_NAME: 'users',
  POWERTOOLS_LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
  LOG_LEVEL: stage === 'prod' ? 'INFO' : 'DEBUG',
},
```
