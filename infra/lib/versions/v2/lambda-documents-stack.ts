import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { join } from 'path';
import { ApiGatewayStack } from './api-gateway-stack';
import { ActiveStack } from './stacks';

export interface LambdaDocumentsStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
  readonly stage: string;
}

export class LambdaDocumentsStack extends BaseStack {
  private readonly allowedMethods: string[] = ['GET', 'OPTIONS'];

  constructor(scope: Construct, id: string, props: LambdaDocumentsStackProps) {
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
    const fnName = `fm-${stage}-documents`;
    const logGroup = new LogGroup(this, `${stackName}-DocumentsLogGroup`, {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: RetentionDays.THREE_MONTHS,
    });

    const lambda = new NodejsFunction(this, `${stackName}-DocumentsFn`, {
      functionName: fnName,
      runtime: Runtime.NODEJS_24_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/documents/src/index.ts',
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

    // ── Routes ───────────────────────────────────────────────
    const integration = ApiGatewayStack.integration(lambda);
    const documentsResource = gateway.api.root.addResource('documents');
    documentsResource.addMethod('GET', integration, gateway.authOnly());

    exportForCrossVersion(
      this,
      'FunctionName',
      lambda.functionName,
      version,
      'LambdaDocuments',
    );
  }
}
