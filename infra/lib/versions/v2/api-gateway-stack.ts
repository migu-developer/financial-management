import { BaseStack, BaseStackProps } from '@core/base-stack';
import { importFromVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  GatewayResponse,
  type JsonSchema,
  LambdaIntegration,
  type MethodOptions,
  Model,
  RequestValidator,
  ResponseType,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ErrorCode } from '@packages/models/shared/utils/errors';
import { errorsSchema } from '@packages/models/expenses/error.schema';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly allowedOrigins: string[];
  readonly stage: string;
}

const errorCodeToResponseType: Record<ErrorCode, ResponseType> = {
  [ErrorCode.BAD_REQUEST_BODY]: ResponseType.BAD_REQUEST_BODY,
  [ErrorCode.BAD_REQUEST_PARAMETERS]: ResponseType.BAD_REQUEST_PARAMETERS,
  [ErrorCode.UNAUTHORIZED]: ResponseType.UNAUTHORIZED,
  [ErrorCode.ACCESS_DENIED]: ResponseType.ACCESS_DENIED,
};

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export class ApiGatewayStack extends BaseStack {
  public readonly api: RestApi;
  public readonly authorizer: CognitoUserPoolsAuthorizer;
  public readonly bodyValidator: RequestValidator;
  public readonly paramsValidator: RequestValidator;
  public readonly bodyAndParamsValidator: RequestValidator;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    const { version, stackName, description, allowedOrigins, stage } = props;
    super(scope, id, { version, stackName, description });

    // ── REST API ──────────────────────────────────────────────
    this.api = new RestApi(this, `${stackName}-Api`, {
      restApiName: `${stackName}-Api`,
      description: 'Shared REST API for financial management services',
      deployOptions: { stageName: stage },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: ALLOWED_METHODS,
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

    // ── Custom Error Responses ────────────────────────────────
    for (const error of errorsSchema) {
      new GatewayResponse(this, `${stackName}-${error.name}`, {
        restApi: this.api,
        type: errorCodeToResponseType[error.type],
        statusCode: error.statusCode.toString(),
        responseHeaders: {
          'Access-Control-Allow-Origin': "'*'",
        },
        templates: {
          'application/json': JSON.stringify(error.template),
        },
      });
    }

    // ── Request Validators ────────────────────────────────────
    this.bodyValidator = new RequestValidator(
      this,
      `${stackName}-BodyValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-body`,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    );

    this.paramsValidator = new RequestValidator(
      this,
      `${stackName}-ParamsValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-params`,
        validateRequestBody: false,
        validateRequestParameters: true,
      },
    );

    this.bodyAndParamsValidator = new RequestValidator(
      this,
      `${stackName}-BodyAndParamsValidator`,
      {
        restApi: this.api,
        requestValidatorName: `${stackName}-validate-body-and-params`,
        validateRequestBody: true,
        validateRequestParameters: true,
      },
    );

    // ── Cognito Authorizer ────────────────────────────────────
    const usersPoolArn = importFromVersion(this, 'v1', 'Auth', 'UserPoolArn');
    const usersPool = UserPool.fromUserPoolArn(
      this,
      `${stackName}-ImportedUsersPool`,
      usersPoolArn,
    );
    this.authorizer = new CognitoUserPoolsAuthorizer(
      this,
      `${stackName}-Authorizer`,
      { cognitoUserPools: [usersPool] },
    );

    // ── Output ────────────────────────────────────────────────
    new CfnOutput(this, `${stackName}-ApiUrl`, {
      value: this.api.url,
      description: 'URL of the shared API Gateway',
    });
  }

  /**
   * Helper: creates an API Gateway Model from a JSON schema definition.
   */
  createModel(id: string, modelName: string, schema: JsonSchema): Model {
    return new Model(this, id, {
      restApi: this.api,
      contentType: 'application/json',
      modelName,
      schema,
    });
  }

  /**
   * Helper: creates MethodOptions for auth-only routes (no body validation).
   */
  authOnly(): MethodOptions {
    return {
      authorizer: this.authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: this.paramsValidator,
    };
  }

  /**
   * Helper: creates MethodOptions with body validation.
   */
  authWithBody(model: Model): MethodOptions {
    return {
      authorizer: this.authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: this.bodyValidator,
      requestModels: { 'application/json': model },
    };
  }

  /**
   * Helper: creates MethodOptions with body + params validation.
   */
  authWithBodyAndParams(model: Model): MethodOptions {
    return {
      authorizer: this.authorizer,
      authorizationType: AuthorizationType.COGNITO,
      requestValidator: this.bodyAndParamsValidator,
      requestModels: { 'application/json': model },
    };
  }

  /**
   * Helper: creates a LambdaIntegration for a given function.
   */
  static integration(lambda: unknown): LambdaIntegration {
    return new LambdaIntegration(lambda as never);
  }
}
