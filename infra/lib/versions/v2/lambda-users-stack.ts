import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import type { JsonSchema } from 'aws-cdk-lib/aws-apigateway';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  createUserSchema,
  patchUserSchema,
} from '@packages/models/users/schema';
import { Construct } from 'constructs';
import { join } from 'path';
import { ApiGatewayStack } from './api-gateway-stack';
import { ActiveStack } from './stacks';

export interface LambdaUsersStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
  readonly stage: string;
}

export class LambdaUsersStack extends BaseStack {
  private readonly allowedMethods: string[] = [
    'GET',
    'POST',
    'PATCH',
    'OPTIONS',
  ];

  constructor(scope: Construct, id: string, props: LambdaUsersStackProps) {
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

    // ── Lambda Function ─────────────────────────────────────
    const fnName = `fm-${stage}-users`;
    const logGroup = new LogGroup(this, `${stackName}-UsersLogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: RetentionDays.THREE_MONTHS,
    });

    const lambda = new NodejsFunction(this, `${stackName}-UsersFn`, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/users/src/index.ts',
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
      },
    });

    // ── Models ───────────────────────────────────────────────
    const createModel = gateway.createModel(
      `${stackName}-CreateUserModel`,
      'CreateUser',
      createUserSchema as JsonSchema,
    );
    const patchModel = gateway.createModel(
      `${stackName}-PatchUserModel`,
      'PatchUser',
      patchUserSchema as JsonSchema,
    );

    // ── Routes ───────────────────────────────────────────────
    const integration = ApiGatewayStack.integration(lambda);

    const usersResource = gateway.api.root.addResource('users');
    usersResource.addMethod(
      'POST',
      integration,
      gateway.authWithBody(createModel),
    );

    const singleUserResource = usersResource.addResource('{id}');
    singleUserResource.addMethod('GET', integration, gateway.authOnly());
    singleUserResource.addMethod(
      'PATCH',
      integration,
      gateway.authWithBodyAndParams(patchModel),
    );

    exportForCrossVersion(
      this,
      'FunctionName',
      lambda.functionName,
      version,
      'LambdaUsers',
    );
  }
}
