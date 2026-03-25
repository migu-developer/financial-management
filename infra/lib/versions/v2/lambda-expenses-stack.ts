import { BaseStack, BaseStackProps } from '@core/base-stack';
import { importFromVersion } from '@utils/cross-version';
import { StackDeps } from '@utils/types';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  JsonSchema,
  LambdaIntegration,
  MethodOptions,
  Model,
  RequestValidator,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  createExpenseSchema,
  patchExpenseSchema,
} from '@packages/models/expenses';
import { Construct } from 'constructs';
import { join } from 'path';
import { updateExpenseSchema } from '@packages/models/expenses/schema';

export interface LambdaExpensesStackProps extends BaseStackProps {
  /** Optional: only needed if this stack depends on other v2 stacks. */
  readonly deps?: StackDeps;

  /** Database URL. */
  readonly databaseUrl: string;

  /** Allowed origins for CORS. */
  readonly allowedOrigins: string[];

  /** Api gateway stage. */
  readonly stage: string;
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

  public readonly api: RestApi;

  constructor(scope: Construct, id: string, props: LambdaExpensesStackProps) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      allowedOrigins,
      stage,
    } = props;
    super(scope, id, { version, stackName, description });

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
      },
      handler: 'handler',
      timeout: Duration.seconds(30),
      environment: {
        DATABASE_URL: databaseUrl,
      },
    });

    // ── API Gateway (REST API) ─────────────────────────────────────
    this.api = new RestApi(this, `${stackName}-ExpensesApi`, {
      restApiName: `${stackName}-ExpensesApi`,
      description: 'API for expenses service',
      deployOptions: {
        stageName: stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: this.allowedMethods,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
        maxAge: Duration.seconds(300),
      },
    });

    // ── Request Validators ────────────────────────────────────
    const bodyValidator = new RequestValidator(
      this,
      `${stackName}-BodyValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-body`,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    );

    const paramsValidator = new RequestValidator(
      this,
      `${stackName}-ParamsValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-params`,
        validateRequestBody: false,
        validateRequestParameters: true,
      },
    );

    const bodyAndParamsValidator = new RequestValidator(
      this,
      `${stackName}-BodyAndParamsValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-body-and-params`,
        validateRequestBody: true,
        validateRequestParameters: true,
      },
    );

    // ── JSON Schema Models (from @packages/models) ─────────────
    const createExpenseModel = new Model(
      this,
      `${stackName}-CreateExpenseModel`,
      {
        restApi: this.api,
        contentType: 'application/json',
        modelName: 'CreateExpense',
        schema: createExpenseSchema as JsonSchema,
      },
    );

    const updateExpenseModel = new Model(
      this,
      `${stackName}-UpdateExpenseModel`,
      {
        restApi: this.api,
        contentType: 'application/json',
        modelName: 'UpdateExpense',
        schema: updateExpenseSchema as JsonSchema,
      },
    );

    const patchExpenseModel = new Model(
      this,
      `${stackName}-PatchExpenseModel`,
      {
        restApi: this.api,
        contentType: 'application/json',
        modelName: 'PatchExpense',
        schema: patchExpenseSchema as JsonSchema,
      },
    );

    // ── Cognito Authorizer ─────────────────────────────────
    const usersPoolArn = importFromVersion(this, 'v1', 'Auth', 'UserPoolArn');

    const usersPool = UserPool.fromUserPoolArn(
      this,
      `${stackName}-ImportedUsersPool`,
      usersPoolArn,
    );

    const authorizer = new CognitoUserPoolsAuthorizer(
      this,
      `${stackName}-ExpensesAuthorizer`,
      { cognitoUserPools: [usersPool] },
    );

    // ── Lambda Integration ─────────────────────────────────
    const integration = new LambdaIntegration(lambda);

    // ── Method Options ─────────────────────────────────────
    const authOnly: MethodOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: paramsValidator,
    };

    const authWithCreateBody: MethodOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': createExpenseModel },
    };

    const authWithUpdateBody: MethodOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: bodyAndParamsValidator,
      requestModels: { 'application/json': updateExpenseModel },
    };

    const authWithPatchBody: MethodOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: bodyAndParamsValidator,
      requestModels: { 'application/json': patchExpenseModel },
    };

    // ── /expenses resource (collection) ────────────────────
    const expensesResource = this.api.root.addResource('expenses');
    expensesResource.addMethod('GET', integration, authOnly);
    expensesResource.addMethod('POST', integration, authWithCreateBody);

    // ── /expenses/{id} resource (single item) ──────────────
    const singleExpenseResource = expensesResource.addResource('{id}');
    singleExpenseResource.addMethod('GET', integration, authOnly);
    singleExpenseResource.addMethod('PUT', integration, authWithUpdateBody);
    singleExpenseResource.addMethod('PATCH', integration, authWithPatchBody);
    singleExpenseResource.addMethod('DELETE', integration, authOnly);

    // ── Output ─────────────────────────────────────────────
    new CfnOutput(this, `${stackName}-ExpensesApiUrl`, {
      value: this.api.url,
      description: 'URL of the expenses API',
    });
  }
}
