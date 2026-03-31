import { BaseStack, BaseStackProps } from '@core/base-stack';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import { ApiGatewayStack } from './api-gateway-stack';

export interface LambdaCurrenciesStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
}

export class LambdaCurrenciesStack extends BaseStack {
  private readonly allowedMethods: string[] = ['GET', 'OPTIONS'];

  constructor(scope: Construct, id: string, props: LambdaCurrenciesStackProps) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      databaseReadonlyUrl,
      allowedOrigins,
      deps,
    } = props;
    super(scope, id, { version, stackName, description });

    const gateway = deps?.getStack('ApiGateway') as ApiGatewayStack;

    // ── Lambda Function ─────────────────────────────────────
    const lambda = new NodejsFunction(this, `${stackName}-CurrenciesFn`, {
      runtime: Runtime.NODEJS_22_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/currencies/src/index.ts',
      ),
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
      },
      handler: 'handler',
      timeout: Duration.seconds(30),
      environment: {
        DATABASE_URL: databaseUrl,
        DATABASE_READONLY_URL: databaseReadonlyUrl,
        ALLOWED_ORIGINS: allowedOrigins.join(','),
        ALLOWED_METHODS: this.allowedMethods.join(','),
      },
    });

    // ── Routes ───────────────────────────────────────────────
    const integration = ApiGatewayStack.integration(lambda);
    const currenciesResource = gateway.api.root.addResource('currencies');
    currenciesResource.addMethod('GET', integration, gateway.authOnly());
  }
}
