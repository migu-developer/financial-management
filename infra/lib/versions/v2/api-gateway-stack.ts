import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion, importFromVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  DomainName,
  EndpointType,
  GatewayResponse,
  type JsonSchema,
  LambdaIntegration,
  type MethodOptions,
  Model,
  RequestValidator,
  ResponseType,
  RestApi,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import { ErrorCode } from '@packages/models/shared/utils/errors';
import { errorsSchema } from '@packages/models/expenses/error.schema';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  readonly allowedOrigins: string[];
  readonly stage: string;
  /** Root domain of the Route53 Hosted Zone (e.g. financial-management.migudev.com). */
  readonly customDomain?: string;
  /** Route53 Hosted Zone ID. Required when customDomain is set. */
  readonly customDomainHostedZoneId?: string;
  /** Subdomain prefix (e.g. 'api' or 'dev-api'). Defaults to '' for root. */
  readonly customDomainPrefix?: string;
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
  /** Custom domain URL (e.g. https://dev-api.example.com) or undefined if not configured. */
  public readonly customApiUrl?: string;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    const { version, stackName, description, allowedOrigins, stage } = props;
    super(scope, id, { version, stackName, description });

    // ── REST API ──────────────────────────────────────────────
    this.api = new RestApi(this, `${stackName}-Api`, {
      restApiName: `${stackName}-Api`,
      description: 'Shared REST API for financial management services',
      deployOptions: {
        stageName: stage,
        throttlingRateLimit: 50,
        throttlingBurstLimit: 100,
        methodOptions: {
          '/expenses/GET': {
            throttlingRateLimit: 30,
            throttlingBurstLimit: 50,
          },
          '/expenses/POST': {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
          },
          '/expenses/{id}/PUT': {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
          },
          '/expenses/{id}/PATCH': {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
          },
          '/expenses/{id}/DELETE': {
            throttlingRateLimit: 5,
            throttlingBurstLimit: 10,
          },
          '/expenses/types/GET': {
            throttlingRateLimit: 20,
            throttlingBurstLimit: 40,
          },
          '/expenses/categories/GET': {
            throttlingRateLimit: 20,
            throttlingBurstLimit: 40,
          },
          '/currencies/GET': {
            throttlingRateLimit: 20,
            throttlingBurstLimit: 40,
          },
          '/documents/GET': {
            throttlingRateLimit: 15,
            throttlingBurstLimit: 30,
          },
          '/users/GET': {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
          },
          '/users/{id}/PATCH': {
            throttlingRateLimit: 10,
            throttlingBurstLimit: 20,
          },
        },
      },
      endpointTypes: [EndpointType.REGIONAL],
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

    // ── Custom domain ──────────────────────────────────────────
    if (props.customDomain && !props.customDomainHostedZoneId) {
      throw new Error(
        'customDomainHostedZoneId is required when customDomain is set.',
      );
    }

    if (props.customDomain && props.customDomainHostedZoneId) {
      const prefix = props.customDomainPrefix ?? '';

      if (prefix.includes('.')) {
        throw new Error(
          'customDomainPrefix must be a single label without dots (e.g. "dev-api", not "dev.api").',
        );
      }

      const fullDomain = prefix
        ? `${prefix}.${props.customDomain}`
        : props.customDomain;

      const hostedZone = HostedZone.fromHostedZoneAttributes(
        this,
        `${stackName}-Zone`,
        {
          hostedZoneId: props.customDomainHostedZoneId,
          zoneName: props.customDomain,
        },
      );

      const certificate = new Certificate(this, `${stackName}-Certificate`, {
        domainName: `*.${props.customDomain}`,
        subjectAlternativeNames: [props.customDomain],
        validation: CertificateValidation.fromDns(hostedZone),
      });

      const apiDomainName = new DomainName(this, `${stackName}-DomainName`, {
        domainName: fullDomain,
        certificate,
        endpointType: EndpointType.REGIONAL,
        securityPolicy: SecurityPolicy.TLS_1_2,
      });

      apiDomainName.addBasePathMapping(this.api, {
        basePath: '',
        stage: this.api.deploymentStage,
      });

      new ARecord(this, `${stackName}-ApiAliasRecord`, {
        zone: hostedZone,
        recordName: fullDomain,
        target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomainName)),
      });

      this.customApiUrl = `https://${fullDomain}`;

      new CfnOutput(this, 'CustomApiUrl', {
        value: this.customApiUrl,
        description: 'Custom domain URL for the API',
      });
    }

    // ── Output ────────────────────────────────────────────────
    new CfnOutput(this, `${stackName}-ApiUrl`, {
      value: this.api.url,
      description: 'URL of the shared API Gateway',
    });

    exportForCrossVersion(
      this,
      'ApiName',
      `${stackName}-Api`,
      version,
      'ApiGateway',
    );
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
