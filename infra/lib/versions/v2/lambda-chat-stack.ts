import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { join } from 'path';
import { ApiGatewayStack } from './api-gateway-stack';
import { ActiveStack } from './stacks';

export interface LambdaChatStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
  readonly stage: string;
}

/**
 * Lambda stack for the AI chat module.
 *
 * Provisions a single Lambda function (`fm-{stage}-chat`) that handles:
 *   - POST /chat          → start the async chat workflow (returns 202 ACK)
 *   - POST /chat/confirm  → resume a paused workflow with the user's HITL decision
 *
 * The handler routes both API Gateway paths internally via the chat Router,
 * mirroring the pattern used by `services/users` (single Lambda per service).
 */
export class LambdaChatStack extends BaseStack {
  private readonly allowedMethods: string[] = ['POST', 'OPTIONS'];

  constructor(scope: Construct, id: string, props: LambdaChatStackProps) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      databaseReadonlyUrl,
      allowedOrigins,
      deps,
      stage,
    } = props;
    super(scope, id, { version, stackName, description });

    const gateway = deps?.getStack(ActiveStack.API_GATEWAY) as ApiGatewayStack;

    // Imported from the StepFunctionsChat stack (same v2). Available as a
    // CloudFormation token; we don't need to know it at synth time.
    const chatStateMachineArn = importFromVersion(
      this,
      version,
      'StepFunctionsChat',
      'StateMachineArn',
    );

    // ── Lambda Function ─────────────────────────────────────
    const fnName = `fm-${stage}-chat`;
    const logGroup = new LogGroup(this, `${stackName}-ChatLogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: RetentionDays.THREE_MONTHS,
    });

    const lambda = new NodejsFunction(this, `${stackName}-ChatFn`, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/chat/src/handlers/chat.ts',
      ),
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
        nodeModules: ['aws-xray-sdk-core'],
        environment: { npm_config_trust_policy: 'lenient' },
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      handler: 'handler',
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
      logGroup,
      environment: {
        DATABASE_URL: databaseUrl,
        DATABASE_READONLY_URL: databaseReadonlyUrl,
        ALLOWED_ORIGINS: allowedOrigins.join(','),
        ALLOWED_METHODS: this.allowedMethods.join(','),
        CHAT_STATE_MACHINE_ARN: chatStateMachineArn,
      },
    });

    // ── IAM: allow starting and resuming chat workflows ─────
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [chatStateMachineArn],
      }),
    );
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
        // SendTask* operates on task tokens, not ARNs. Resource must be '*'.
        resources: ['*'],
      }),
    );

    // ── API Gateway Routes ───────────────────────────────────
    const integration = ApiGatewayStack.integration(lambda);

    // Minimal passthrough JSON model. Body validation lives in the chat
    // service layer; this just ensures API Gateway accepts JSON payloads.
    const passthroughModel = gateway.createModel(
      `${stackName}-ChatBodyModel`,
      'ChatBody',
      { type: 'object', additionalProperties: true } as never,
    );

    const chatResource = gateway.api.root.addResource('chat');
    chatResource.addMethod(
      'POST',
      integration,
      gateway.authWithBody(passthroughModel),
    );

    const confirmResource = chatResource.addResource('confirm');
    confirmResource.addMethod(
      'POST',
      integration,
      gateway.authWithBody(passthroughModel),
    );

    // GET /chat/sessions — list the user's sessions for the sidebar.
    const sessionsResource = chatResource.addResource('sessions');
    sessionsResource.addMethod('GET', integration, gateway.authOnly());

    // GET /chat/sessions/{id}/messages — restore a session's conversation.
    const sessionMessagesResource = sessionsResource
      .addResource('{id}')
      .addResource('messages');
    sessionMessagesResource.addMethod('GET', integration, gateway.authOnly());

    // ── Cross-version export ────────────────────────────────
    exportForCrossVersion(
      this,
      'FunctionName',
      lambda.functionName,
      version,
      'LambdaChat',
    );
  }
}
