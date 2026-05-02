import { Construct } from 'constructs';
import { LambdaExchangeRatesStack } from './lambda-exchange-rates-stack';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

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
    Duration: {
      seconds: (s: number) => s,
      hours: (h: number) => h * 3600,
    },
  };
});

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_24_X: 'nodejs24.x' },
  Tracing: { ACTIVE: 'Active' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({
    functionName: 'fm-dev-update-rates',
    functionArn: 'arn:aws:lambda:us-east-1:123:function:fm-dev-update-rates',
  })),
  OutputFormat: { ESM: 'ESM' },
}));

jest.mock('aws-cdk-lib/aws-logs', () => ({
  LogGroup: jest.fn(),
  RetentionDays: { THREE_MONTHS: 90 },
}));

jest.mock('aws-cdk-lib/aws-events', () => ({
  Rule: jest.fn(),
  Schedule: { rate: jest.fn((d: unknown) => d) },
}));

jest.mock('aws-cdk-lib/aws-events-targets', () => ({
  LambdaFunction: jest.fn(),
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaExchangeRates',
  description: 'Test Lambda Exchange Rates stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  exchangeRateApiKey: 'test-api-key',
  exchangeRateApiBaseUrl: 'https://api.example.com',
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaExchangeRatesStack(
    app as unknown as Construct,
    'TestLambdaExchangeRatesStack',
    defaultProps,
  );
}

describe('LambdaExchangeRatesStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaExchangeRates');
  });

  describe('Lambda function', () => {
    test('uses Node.js 24 runtime', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.runtime).toBe('nodejs24.x');
    });

    test('has 60 second timeout', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.timeout).toBe(60);
    });

    test('has 128 MB memory', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.memorySize).toBe(128);
    });

    test('receives all required env vars', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const env = fnProps.environment as Record<string, string>;
      expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(env.EXCHANGE_RATE_API_KEY).toBe('test-api-key');
      expect(env.EXCHANGE_RATE_API_BASE_URL).toBe('https://api.example.com');
    });
  });

  describe('EventBridge schedule', () => {
    test('creates rule with 12-hour rate', () => {
      createStack();
      const { Schedule } = jest.requireMock('aws-cdk-lib/aws-events') as {
        Schedule: { rate: jest.Mock };
      };
      expect(Schedule.rate).toHaveBeenCalledWith(12 * 3600);
    });

    test('creates rule with correct name', () => {
      createStack();
      const { Rule: MockRule } = jest.requireMock('aws-cdk-lib/aws-events') as {
        Rule: jest.Mock;
      };
      expect(MockRule).toHaveBeenCalledTimes(1);
      const ruleProps = MockRule.mock.calls[0]![2] as Record<string, unknown>;
      expect(ruleProps.ruleName).toBe('fm-dev-update-rates-schedule');
    });
  });

  test('exports FunctionName via cross-version', () => {
    createStack();
    const { exportForCrossVersion } = jest.requireMock<
      Record<string, jest.Mock>
    >('@utils/cross-version');
    const calls = (exportForCrossVersion as jest.Mock).mock.calls;
    const exportKeys = calls.map((c: unknown[]) => c[1]);
    expect(exportKeys).toContain('FunctionName');
  });
});
