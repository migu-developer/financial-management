import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { Duration } from 'aws-cdk-lib';
import type { JsonSchema } from 'aws-cdk-lib/aws-apigateway';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  createExpenseSchema,
  patchExpenseSchema,
} from '@packages/models/expenses';
import { updateExpenseSchema } from '@packages/models/expenses/schema';
import { Construct } from 'constructs';
import { join } from 'path';
import { ApiGatewayStack } from './api-gateway-stack';
import { ActiveStack } from './stacks';

export interface LambdaExpensesStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
}

export class LambdaExpensesStack extends BaseStack {
  private readonly allowedMethods: string[] = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ];

  constructor(scope: Construct, id: string, props: LambdaExpensesStackProps) {
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

    const gateway = deps?.getStack(ActiveStack.API_GATEWAY) as ApiGatewayStack;

    // ── Lambda Function ─────────────────────────────────────
    const lambda = new NodejsFunction(this, `${stackName}-ExpensesFn`, {
      runtime: Runtime.NODEJS_22_X,
      entry: join(
        __dirname,
        '../../../node_modules/@services/expenses/src/index.ts',
      ),
      bundling: {
        format: OutputFormat.ESM,
        sourceMap: true,
        minify: true,
        nodeModules: ['aws-xray-sdk-core'],
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      handler: 'handler',
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
      environment: {
        DATABASE_URL: databaseUrl,
        DATABASE_READONLY_URL: databaseReadonlyUrl,
        ALLOWED_ORIGINS: allowedOrigins.join(','),
        ALLOWED_METHODS: this.allowedMethods.join(','),
      },
    });

    // ── Models ───────────────────────────────────────────────
    const createModel = gateway.createModel(
      `${stackName}-CreateExpenseModel`,
      'CreateExpense',
      createExpenseSchema as JsonSchema,
    );
    const updateModel = gateway.createModel(
      `${stackName}-UpdateExpenseModel`,
      'UpdateExpense',
      updateExpenseSchema as JsonSchema,
    );
    const patchModel = gateway.createModel(
      `${stackName}-PatchExpenseModel`,
      'PatchExpense',
      patchExpenseSchema as JsonSchema,
    );

    // ── Routes ───────────────────────────────────────────────
    const integration = ApiGatewayStack.integration(lambda);
    const api = gateway.api;

    const expensesResource = api.root.addResource('expenses');
    expensesResource.addMethod('GET', integration, gateway.authOnly());
    expensesResource.addMethod(
      'POST',
      integration,
      gateway.authWithBody(createModel),
    );

    const singleExpenseResource = expensesResource.addResource('{id}');
    singleExpenseResource.addMethod('GET', integration, gateway.authOnly());
    singleExpenseResource.addMethod(
      'PUT',
      integration,
      gateway.authWithBodyAndParams(updateModel),
    );
    singleExpenseResource.addMethod(
      'PATCH',
      integration,
      gateway.authWithBodyAndParams(patchModel),
    );
    singleExpenseResource.addMethod('DELETE', integration, gateway.authOnly());

    const typesResource = expensesResource.addResource('types');
    typesResource.addMethod('GET', integration, gateway.authOnly());

    const categoriesResource = expensesResource.addResource('categories');
    categoriesResource.addMethod('GET', integration, gateway.authOnly());

    exportForCrossVersion(
      this,
      'FunctionName',
      lambda.functionName,
      version,
      'LambdaExpenses',
    );
  }
}
