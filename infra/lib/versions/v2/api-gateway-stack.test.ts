import { Construct } from 'constructs';
import { ApiGatewayStack } from './api-gateway-stack';
import { importFromVersion } from '@utils/cross-version';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const mockImportFromVersion = importFromVersion as jest.MockedFunction<
  typeof importFromVersion
>;

const mockApi = {
  url: 'https://mock-api.execute-api.us-east-1.amazonaws.com/dev/',
  root: { addResource: jest.fn() },
};

const mockRequestValidator = { requestValidatorId: 'mock-validator' };
const mockModel = { modelId: 'mock-model' };
const mockAuthorizer = { authorizerId: 'mock-authorizer-id' };

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    node = { addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    App: jest.fn().mockImplementation(() => ({
      node: { tryGetContext: jest.fn(), children: [] },
    })),
    CfnOutput: jest.fn(),
    Duration: { seconds: (s: number) => s },
  };
});

const mockDomainName = {
  addBasePathMapping: jest.fn(),
};

jest.mock('aws-cdk-lib/aws-apigateway', () => ({
  RestApi: jest.fn().mockImplementation(() => mockApi),
  CognitoUserPoolsAuthorizer: jest
    .fn()
    .mockImplementation(() => mockAuthorizer),
  LambdaIntegration: jest.fn().mockImplementation(() => ({
    integrationId: 'mock-integration',
  })),
  RequestValidator: jest.fn().mockImplementation(() => mockRequestValidator),
  Model: jest.fn().mockImplementation(() => mockModel),
  DomainName: jest.fn().mockImplementation(() => mockDomainName),
  GatewayResponse: jest.fn(),
  CfnDocumentationPart: jest.fn(),
  CfnDocumentationVersion: jest.fn(),
  EndpointType: { REGIONAL: 'REGIONAL' },
  SecurityPolicy: { TLS_1_2: 'TLS_1_2' },
  ResponseType: {
    BAD_REQUEST_BODY: 'BAD_REQUEST_BODY',
    BAD_REQUEST_PARAMETERS: 'BAD_REQUEST_PARAMETERS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    ACCESS_DENIED: 'ACCESS_DENIED',
  },
  AuthorizationType: { COGNITO: 'COGNITO' },
  JsonSchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
  },
  JsonSchemaVersion: { DRAFT4: 'http://json-schema.org/draft-04/schema#' },
}));

jest.mock('aws-cdk-lib/aws-certificatemanager', () => ({
  Certificate: jest.fn().mockImplementation(() => ({
    certificateArn: 'arn:aws:acm:us-east-1:123:certificate/mock',
  })),
  CertificateValidation: {
    fromDns: jest.fn().mockReturnValue('dns-validation'),
  },
}));

jest.mock('aws-cdk-lib/aws-route53', () => ({
  HostedZone: {
    fromHostedZoneAttributes: jest
      .fn()
      .mockReturnValue({ hostedZoneId: 'mock-zone' }),
  },
  ARecord: jest.fn(),
  RecordTarget: { fromAlias: jest.fn().mockReturnValue('mock-alias-target') },
}));

jest.mock('aws-cdk-lib/aws-route53-targets', () => ({
  ApiGatewayDomain: jest.fn().mockReturnValue('mock-apigw-domain-target'),
}));

jest.mock('aws-cdk-lib/aws-cognito', () => ({
  UserPool: {
    fromUserPoolArn: jest.fn().mockReturnValue({ userPoolId: 'mock-pool' }),
  },
}));

const defaultProps = {
  version: 'v2',
  stackName: 'ApiGateway',
  description: 'Test ApiGateway stack',
  allowedOrigins: ['https://test.com'],
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new ApiGatewayStack(
    app as unknown as Construct,
    'TestApiGatewayStack',
    defaultProps,
  );
}

function getApiGatewayMocks() {
  return jest.requireMock<Record<string, jest.Mock>>(
    'aws-cdk-lib/aws-apigateway',
  );
}

describe('ApiGatewayStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportFromVersion.mockImplementation(
      (_scope: unknown, _v: string, _stack: string, key: string) =>
        `imported-${key}`,
    );
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('creates RestApi with CORS and stage', () => {
    createStack();
    const { RestApi: MockRestApi } = getApiGatewayMocks();
    expect(MockRestApi).toHaveBeenCalledTimes(1);
    const apiProps = (MockRestApi as jest.Mock).mock.calls[0]![2] as Record<
      string,
      unknown
    >;
    const deployOpts = apiProps.deployOptions as Record<string, unknown>;
    expect(deployOpts.stageName).toBe('dev');
    expect(deployOpts.throttlingRateLimit).toBe(50);
    expect(deployOpts.throttlingBurstLimit).toBe(100);
    expect(deployOpts.methodOptions).toBeDefined();
    const cors = apiProps.defaultCorsPreflightOptions as Record<
      string,
      unknown
    >;
    expect(cors.allowOrigins).toEqual(['https://test.com']);
    expect(cors.allowCredentials).toBe(true);
  });

  test('creates 3 request validators (body, params, body+params)', () => {
    createStack();
    const { RequestValidator: MockValidator } = getApiGatewayMocks();
    expect(MockValidator).toHaveBeenCalledTimes(3);

    const names = (MockValidator as jest.Mock).mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).requestValidatorName,
    );
    expect(names).toContain('ApiGateway-validate-body');
    expect(names).toContain('ApiGateway-validate-params');
    expect(names).toContain('ApiGateway-validate-body-and-params');
  });

  test('creates CognitoUserPoolsAuthorizer importing UserPoolArn from v1', () => {
    createStack();
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'UserPoolArn',
    );
    const { CognitoUserPoolsAuthorizer: MockAuth } = getApiGatewayMocks();
    expect(MockAuth).toHaveBeenCalledTimes(1);
  });

  test('creates 4 GatewayResponses (error responses)', () => {
    createStack();
    const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
    const GwMock = MockGatewayResponse as jest.Mock;
    expect(GwMock).toHaveBeenCalledTimes(4);

    const types = GwMock.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).type,
    );
    expect(types).toContain('BAD_REQUEST_BODY');
    expect(types).toContain('BAD_REQUEST_PARAMETERS');
    expect(types).toContain('UNAUTHORIZED');
    expect(types).toContain('ACCESS_DENIED');
  });

  test('exposes api, authorizer, bodyValidator, paramsValidator, bodyAndParamsValidator', () => {
    const stack = createStack();
    expect(stack.api).toBe(mockApi);
    expect(stack.authorizer).toBe(mockAuthorizer);
    expect(stack.bodyValidator).toBe(mockRequestValidator);
    expect(stack.paramsValidator).toBe(mockRequestValidator);
    expect(stack.bodyAndParamsValidator).toBe(mockRequestValidator);
  });

  test('createModel helper creates a Model with correct restApi', () => {
    const stack = createStack();
    const mockSchema = { type: 'object' };
    stack.createModel('TestModel', 'TestModelName', mockSchema as never);
    const { Model: MockModel } = getApiGatewayMocks();
    expect(MockModel).toHaveBeenCalledWith(
      expect.anything(),
      'TestModel',
      expect.objectContaining({
        restApi: mockApi,
        contentType: 'application/json',
        modelName: 'TestModelName',
        schema: mockSchema,
      }),
    );
  });

  test('authOnly returns method options with COGNITO auth + paramsValidator', () => {
    const stack = createStack();
    const opts = stack.authOnly();
    expect(opts.authorizationType).toBe('COGNITO');
    expect(opts.authorizer).toBe(mockAuthorizer);
    expect(opts.requestValidator).toBe(mockRequestValidator);
    expect((opts as Record<string, unknown>).requestModels).toBeUndefined();
  });

  test('authWithBody returns method options with COGNITO auth + bodyValidator + model', () => {
    const stack = createStack();
    const model = mockModel as never;
    const opts = stack.authWithBody(model);
    expect(opts.authorizationType).toBe('COGNITO');
    expect(opts.authorizer).toBe(mockAuthorizer);
    expect(opts.requestValidator).toBe(mockRequestValidator);
    expect(opts.requestModels).toEqual({ 'application/json': mockModel });
  });

  test('authWithBodyAndParams returns options with bodyAndParamsValidator + model', () => {
    const stack = createStack();
    const model = mockModel as never;
    const opts = stack.authWithBodyAndParams(model);
    expect(opts.authorizationType).toBe('COGNITO');
    expect(opts.authorizer).toBe(mockAuthorizer);
    expect(opts.requestValidator).toBe(mockRequestValidator);
    expect(opts.requestModels).toEqual({ 'application/json': mockModel });
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-ApiGateway');
  });

  describe('custom error responses', () => {
    test('validation error response includes error detail template', () => {
      createStack();
      const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
      const GwMock = MockGatewayResponse as jest.Mock;

      const bodyErrorCall = GwMock.mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).type === 'BAD_REQUEST_BODY',
      );
      const templates = (bodyErrorCall![2] as Record<string, unknown>)
        .templates as Record<string, string>;
      const parsed = JSON.parse(templates['application/json']!) as Record<
        string,
        string
      >;
      expect(parsed.code).toBe('VALIDATION_ERROR');
      expect(parsed.message).toContain('$context.error.validationErrorString');
    });

    test('all error responses include CORS header', () => {
      createStack();
      const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
      const GwMock = MockGatewayResponse as jest.Mock;

      for (const call of GwMock.mock.calls as unknown[][]) {
        const headers = (call[2] as Record<string, unknown>)
          .responseHeaders as Record<string, string>;
        expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      }
    });
  });

  test('emits CfnOutput for API URL', () => {
    createStack();
    const { CfnOutput: MockCfnOutput } =
      jest.requireMock<Record<string, jest.Mock>>('aws-cdk-lib');
    expect(MockCfnOutput).toHaveBeenCalledTimes(1);
  });

  describe('static integration helper', () => {
    test('creates a LambdaIntegration', () => {
      const mockLambda = {};
      const result = ApiGatewayStack.integration(mockLambda);
      expect(result).toEqual({ integrationId: 'mock-integration' });
    });
  });

  describe('custom domain', () => {
    test('does not create DomainName when customDomain is not provided', () => {
      const { DomainName: MockDomainName } = getApiGatewayMocks();
      (MockDomainName as jest.Mock).mockClear();
      createStack();
      expect(MockDomainName).not.toHaveBeenCalled();
    });

    test('creates certificate, DomainName, base path mapping and ARecord', () => {
      const { DomainName: MockDomainName } = getApiGatewayMocks();
      const { Certificate: MockCertificate } = jest.requireMock(
        'aws-cdk-lib/aws-certificatemanager',
      ) as { Certificate: jest.Mock };
      const { ARecord: MockARecord } = jest.requireMock(
        'aws-cdk-lib/aws-route53',
      ) as { ARecord: jest.Mock };

      (MockDomainName as jest.Mock).mockClear();
      MockCertificate.mockClear();
      MockARecord.mockClear();
      mockDomainName.addBasePathMapping.mockClear();

      const app = { node: { tryGetContext: jest.fn(), children: [] } };
      new ApiGatewayStack(app as unknown as Construct, 'TestApiGatewayStack', {
        ...defaultProps,
        customDomain: 'app.example.com',
        customDomainHostedZoneId: 'Z0123456789',
        customDomainPrefix: 'dev-api',
      });

      expect(MockCertificate).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Certificate'),
        expect.objectContaining({
          domainName: '*.app.example.com',
        }),
      );
      expect(MockDomainName).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('DomainName'),
        expect.objectContaining({
          domainName: 'dev-api.app.example.com',
          endpointType: 'REGIONAL',
          securityPolicy: 'TLS_1_2',
        }),
      );
      expect(mockDomainName.addBasePathMapping).toHaveBeenCalled();
      expect(MockARecord).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('ApiAliasRecord'),
        expect.objectContaining({
          recordName: 'dev-api.app.example.com',
        }),
      );
    });

    test('uses root domain when prefix is empty', () => {
      const { DomainName: MockDomainName } = getApiGatewayMocks();
      (MockDomainName as jest.Mock).mockClear();

      const app = { node: { tryGetContext: jest.fn(), children: [] } };
      new ApiGatewayStack(app as unknown as Construct, 'TestApiGatewayStack', {
        ...defaultProps,
        customDomain: 'app.example.com',
        customDomainHostedZoneId: 'Z0123456789',
        customDomainPrefix: '',
      });

      expect(MockDomainName).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          domainName: 'app.example.com',
        }),
      );
    });

    test('throws when customDomain is set without customDomainHostedZoneId', () => {
      const app = { node: { tryGetContext: jest.fn(), children: [] } };
      expect(
        () =>
          new ApiGatewayStack(
            app as unknown as Construct,
            'TestApiGatewayStack',
            {
              ...defaultProps,
              customDomain: 'app.example.com',
            },
          ),
      ).toThrow(
        'customDomainHostedZoneId is required when customDomain is set.',
      );
    });

    test('throws when customDomainPrefix contains dots', () => {
      const app = { node: { tryGetContext: jest.fn(), children: [] } };
      expect(
        () =>
          new ApiGatewayStack(
            app as unknown as Construct,
            'TestApiGatewayStack',
            {
              ...defaultProps,
              customDomain: 'app.example.com',
              customDomainHostedZoneId: 'Z0123456789',
              customDomainPrefix: 'dev.api',
            },
          ),
      ).toThrow('customDomainPrefix must be a single label without dots');
    });
  });
});
