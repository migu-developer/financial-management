import { Construct } from 'constructs';
import { StepFunctionsChatStack } from './step-functions-chat-stack';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const mockAddToRolePolicy = jest.fn();
const mockStateMachineNext = jest.fn().mockReturnThis();

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    region = 'us-east-1';
    account = '123456789012';
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
      minutes: (m: number) => m * 60,
      hours: (h: number) => h * 3600,
    },
  };
});

jest.mock('aws-cdk-lib/aws-bedrock', () => ({
  FoundationModel: {
    fromFoundationModelId: jest
      .fn()
      .mockImplementation(
        (_s: unknown, _id: string, fmi: { modelId: string }) => ({
          modelId: fmi.modelId,
        }),
      ),
  },
  FoundationModelIdentifier: jest.fn().mockImplementation((id: string) => ({
    modelId: id,
  })),
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  PolicyStatement: jest.fn().mockImplementation((props: unknown) => ({
    type: 'PolicyStatement',
    props,
  })),
}));

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_24_X: 'nodejs24.x' },
  Tracing: { ACTIVE: 'Active' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation((_scope, _id, props) => ({
    functionName: (props as { functionName: string }).functionName,
    addToRolePolicy: mockAddToRolePolicy,
  })),
  OutputFormat: { ESM: 'ESM' },
}));

jest.mock('aws-cdk-lib/aws-logs', () => ({
  LogGroup: jest.fn(),
  RetentionDays: { THREE_MONTHS: 90 },
}));

const mockAddToPrincipalPolicy = jest.fn();
const mockStateMachineInstance = {
  stateMachineArn: 'mock-state-machine-arn',
  role: { addToPrincipalPolicy: mockAddToPrincipalPolicy },
};
const mockStateMachineCtor = jest
  .fn()
  .mockImplementation(() => mockStateMachineInstance);

class MockChain {
  next = mockStateMachineNext;
}

jest.mock('aws-cdk-lib/aws-stepfunctions', () => ({
  StateMachine: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockStateMachineCtor(id, props);
      return mockStateMachineInstance;
    }),
  StateMachineType: { STANDARD: 'STANDARD' },
  IntegrationPattern: { WAIT_FOR_TASK_TOKEN: 'waitForTaskToken' },
  DefinitionBody: { fromChainable: jest.fn().mockReturnValue('def-body') },
  LogLevel: { ALL: 'ALL' },
  Pass: jest.fn().mockImplementation(() => new MockChain()),
  Choice: jest.fn().mockImplementation(() => {
    const choiceObj = {
      when: jest.fn().mockReturnThis(),
      otherwise: jest.fn().mockReturnThis(),
      next: mockStateMachineNext,
    };
    return choiceObj;
  }),
  Condition: {
    stringEquals: jest.fn(),
    stringMatches: jest.fn(),
    booleanEquals: jest.fn(),
  },
  JsonPath: { taskToken: 'TASK_TOKEN_PLACEHOLDER' },
  TaskInput: {
    fromObject: jest.fn().mockImplementation((o: unknown) => ({ obj: o })),
    fromJsonPathAt: jest.fn().mockImplementation((p: string) => ({ path: p })),
  },
}));

const mockBedrockTaskCtor = jest.fn();
const mockLambdaInvokeCtor = jest.fn();

jest.mock('aws-cdk-lib/aws-stepfunctions-tasks', () => ({
  BedrockInvokeModel: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockBedrockTaskCtor(id, props);
      return new MockChain();
    }),
  LambdaInvoke: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockLambdaInvokeCtor(id, props);
      return new MockChain();
    }),
}));

const defaultProps = {
  version: 'v2',
  stackName: 'StepFunctionsChat',
  description: 'Test SFN Chat stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  databaseReadonlyUrl: 'postgresql://localhost:5432/test-readonly',
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new StepFunctionsChatStack(
    app as unknown as Construct,
    'TestStepFunctionsChatStack',
    defaultProps,
  );
}

describe('StepFunctionsChatStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-StepFunctionsChat');
  });

  test('imports AppSyncEvents HttpDns, EventApiArn and ChatNamespaceName from v2', () => {
    createStack();
    const { importFromVersion } = jest.requireMock<Record<string, jest.Mock>>(
      '@utils/cross-version',
    );
    const imports = (importFromVersion as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[3] as string,
    );
    expect(imports).toContain('HttpDns');
    expect(imports).toContain('EventApiArn');
    expect(imports).toContain('ChatNamespaceName');
  });

  describe('Task Lambdas', () => {
    test('creates 5 task Lambdas with stage-prefixed function names', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const names = (MockFn as jest.Mock).mock.calls.map(
        (c: unknown[]) => (c[2] as { functionName: string }).functionName,
      );
      expect(names).toEqual([
        'fm-dev-chat-execute-query',
        'fm-dev-chat-validate-fields',
        'fm-dev-chat-create-expense',
        'fm-dev-chat-save-and-publish',
        'fm-dev-chat-save-preview',
      ]);
    });

    test('save Lambdas receive APPSYNC_HTTP_DNS + namespace env vars', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const saveAndPublishProps = (MockFn as jest.Mock).mock.calls[3]![2] as {
        environment: Record<string, string>;
      };
      const savePreviewProps = (MockFn as jest.Mock).mock.calls[4]![2] as {
        environment: Record<string, string>;
      };
      expect(saveAndPublishProps.environment.APPSYNC_HTTP_DNS).toBe(
        'imported-HttpDns',
      );
      expect(saveAndPublishProps.environment.APPSYNC_CHAT_NAMESPACE).toBe(
        'imported-ChatNamespaceName',
      );
      expect(savePreviewProps.environment.APPSYNC_HTTP_DNS).toBe(
        'imported-HttpDns',
      );
    });

    test('grants appsync:EventPublish to save-and-publish and save-preview', () => {
      createStack();
      const publishCalls = mockAddToRolePolicy.mock.calls.filter(
        (c: unknown[]) => {
          const stmt = c[0] as { props: { actions: string[] } };
          return stmt.props.actions.includes('appsync:EventPublish');
        },
      );
      expect(publishCalls).toHaveLength(2);
      // resource is `${EventApiArn}/*`
      const first = publishCalls[0]![0] as {
        props: { resources: string[] };
      };
      expect(first.props.resources[0]).toBe('imported-EventApiArn/*');
    });
  });

  describe('Bedrock tasks', () => {
    test('classifies intent with Nova Micro', () => {
      createStack();
      const classifyCall = mockBedrockTaskCtor.mock.calls.find(
        (c: unknown[]) => c[0] === 'ClassifyIntent',
      );
      expect(classifyCall).toBeDefined();
      const props = classifyCall![1] as { model: { modelId: string } };
      expect(props.model.modelId).toBe('amazon.nova-micro-v1:0');
    });

    test('extraction tasks use Nova Lite', () => {
      createStack();
      const ids = ['ExtractSqlParams', 'ExtractExpenseFields'];
      for (const id of ids) {
        const call = mockBedrockTaskCtor.mock.calls.find(
          (c: unknown[]) => c[0] === id,
        );
        expect(call).toBeDefined();
        const props = call![1] as { model: { modelId: string } };
        expect(props.model.modelId).toBe('amazon.nova-lite-v1:0');
      }
    });

    test('user-facing responses use Claude Haiku 4.5 via inference profile', () => {
      createStack();
      const ids = [
        'GenerateQueryNL',
        'GeneratePreview',
        'GenerateConfirmation',
        'GenerateCancellation',
        'GenerateClarification',
        'GenerateUnknown',
      ];
      for (const id of ids) {
        const call = mockBedrockTaskCtor.mock.calls.find(
          (c: unknown[]) => c[0] === id,
        );
        expect(call).toBeDefined();
        const props = call![1] as { model: { modelArn: string } };
        // Inference profile ARN contains the profile id with `us.` prefix.
        expect(props.model.modelArn).toContain(
          'inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0',
        );
      }
    });

    test('grants the state machine InvokeModel on the underlying foundation model regions', () => {
      createStack();
      const haikuGrant = mockAddToPrincipalPolicy.mock.calls.find(
        (c: unknown[]) => {
          const stmt = c[0] as { props: { resources: string[] } };
          return stmt.props.resources.some((r) =>
            r.includes(
              'foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
            ),
          );
        },
      );
      expect(haikuGrant).toBeDefined();
    });
  });

  describe('Human-in-the-Loop', () => {
    test('WaitForConfirmation uses the waitForTaskToken integration pattern', () => {
      createStack();
      const waitCall = mockLambdaInvokeCtor.mock.calls.find(
        (c: unknown[]) => c[0] === 'WaitForConfirmation',
      );
      expect(waitCall).toBeDefined();
      const props = waitCall![1] as {
        integrationPattern: string;
        payload: { obj: Record<string, unknown> };
      };
      expect(props.integrationPattern).toBe('waitForTaskToken');
      expect(props.payload.obj['taskToken']).toBe('TASK_TOKEN_PLACEHOLDER');
    });
  });

  describe('State machine', () => {
    test('uses STANDARD workflow type', () => {
      createStack();
      const props = mockStateMachineCtor.mock.calls[0]?.[1] as {
        stateMachineType: string;
      };
      expect(props.stateMachineType).toBe('STANDARD');
    });

    test('names the state machine fm-{stage}-chat-process', () => {
      createStack();
      const props = mockStateMachineCtor.mock.calls[0]?.[1] as {
        stateMachineName: string;
      };
      expect(props.stateMachineName).toBe('fm-dev-chat-process');
    });

    test('exports StateMachineArn cross-version', () => {
      createStack();
      const { exportForCrossVersion } = jest.requireMock<
        Record<string, jest.Mock>
      >('@utils/cross-version');
      const exportKeys = (exportForCrossVersion as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[1] as string,
      );
      expect(exportKeys).toContain('StateMachineArn');
    });

    test('exports the 5 task Lambda function names so monitoring can attach alarms', () => {
      createStack();
      const { exportForCrossVersion } = jest.requireMock<
        Record<string, jest.Mock>
      >('@utils/cross-version');
      const exportKeys = (exportForCrossVersion as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[1] as string,
      );
      expect(exportKeys).toEqual(
        expect.arrayContaining([
          'ExecuteQueryFnName',
          'ValidateFieldsFnName',
          'CreateExpenseFnName',
          'SaveAndPublishFnName',
          'SavePreviewFnName',
        ]),
      );
    });
  });
});
