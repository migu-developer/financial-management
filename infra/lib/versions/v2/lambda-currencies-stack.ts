import { BaseStack, BaseStackProps } from '@core/base-stack';
import { StackDeps } from '@utils/types';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  MethodOptions,
  RequestValidator,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import { importFromVersion } from '@utils/cross-version';

export interface LambdaCurrenciesStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly databaseUrl: string;
  readonly databaseReadonlyUrl: string;
  readonly allowedOrigins: string[];
  readonly stage: string;
}

export class LambdaCurrenciesStack extends BaseStack {
  private readonly allowedMethods: string[] = ['GET', 'OPTIONS'];

  public readonly api: RestApi;

  constructor(scope: Construct, id: string, props: LambdaCurrenciesStackProps) {
    const {
      version,
      stackName,
      description,
      databaseUrl,
      databaseReadonlyUrl,
      allowedOrigins,
      stage,
    } = props;
    super(scope, id, { version, stackName, description });

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

    // ── API Gateway (REST API) ─────────────────────────────────────
    this.api = new RestApi(this, `${stackName}-CurrenciesApi`, {
      restApiName: `${stackName}-CurrenciesApi`,
      description: 'API for currencies service',
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

    // ── Request Validator ────────────────────────────────────
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

    // ── Cognito Authorizer ─────────────────────────────────
    const usersPoolArn = importFromVersion(this, 'v1', 'Auth', 'UserPoolArn');

    const usersPool = UserPool.fromUserPoolArn(
      this,
      `${stackName}-ImportedUsersPool`,
      usersPoolArn,
    );

    const authorizer = new CognitoUserPoolsAuthorizer(
      this,
      `${stackName}-CurrenciesAuthorizer`,
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

    // ── /currencies resource ───────────────────────────────
    const currenciesResource = this.api.root.addResource('currencies');
    currenciesResource.addMethod('GET', integration, authOnly);

    // ── Output ─────────────────────────────────────────────
    new CfnOutput(this, `${stackName}-CurrenciesApiUrl`, {
      value: this.api.url,
      description: 'URL of the currencies API',
    });
  }
}
