import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Construct } from 'constructs';
import {
  SHARP_VERSION,
  StepFunctionsImageProcessStack,
} from './step-functions-image-process-stack';

const mockAddToRolePolicy = jest.fn();
const mockAddCatch = jest.fn().mockReturnThis();
const mockAddRetry = jest.fn().mockReturnThis();
const mockNext = jest.fn().mockReturnThis();

class MockChain {
  next = mockNext;
  addCatch = mockAddCatch;
  addRetry = mockAddRetry;
}

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    region = 'us-east-2';
    account = '123456789012';
    node = { addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    Duration: {
      seconds: (s: number) => ({ seconds: s }),
      minutes: (m: number) => ({ minutes: m }),
      days: (d: number) => ({ days: d }),
    },
  };
});

const mockStateMachineCtor = jest.fn();
const mockSmAddToRolePolicy = jest.fn();

jest.mock('aws-cdk-lib/aws-stepfunctions', () => ({
  StateMachine: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockStateMachineCtor(id, props);
      return {
        stateMachineArn: 'arn:aws:states:us-east-2:123:stateMachine:image',
        addToRolePolicy: mockSmAddToRolePolicy,
      };
    }),
  StateMachineType: { STANDARD: 'STANDARD' },
  DefinitionBody: { fromChainable: jest.fn().mockReturnValue('def-body') },
  LogLevel: { ALL: 'ALL', ERROR: 'ERROR' },
  Pass: jest.fn().mockImplementation(() => new MockChain()),
  Fail: jest.fn().mockImplementation(() => new MockChain()),
  Succeed: jest.fn().mockImplementation(() => new MockChain()),
  Choice: jest.fn().mockImplementation(() => ({
    when: jest.fn().mockReturnThis(),
    otherwise: jest.fn().mockReturnThis(),
    next: mockNext,
  })),
  Condition: { stringEquals: jest.fn() },
  TaskInput: {
    fromObject: jest.fn().mockImplementation((o: unknown) => ({ obj: o })),
  },
}));

const mockLambdaInvokeCtor = jest.fn();
const mockCallAwsServiceCtor = jest.fn();

jest.mock('aws-cdk-lib/aws-stepfunctions-tasks', () => ({
  LambdaInvoke: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockLambdaInvokeCtor(id, props);
      return new MockChain();
    }),
  CallAwsService: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockCallAwsServiceCtor(id, props);
      return new MockChain();
    }),
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation((_scope, _id, props) => ({
    functionName: (props as { functionName: string }).functionName,
    addToRolePolicy: mockAddToRolePolicy,
  })),
  OutputFormat: { ESM: 'ESM' },
}));

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_24_X: 'nodejs24.x' },
  Tracing: { ACTIVE: 'Active' },
  Architecture: { X86_64: { name: 'x86_64' } },
}));

jest.mock('aws-cdk-lib/aws-logs', () => ({
  LogGroup: jest.fn(),
  RetentionDays: { THREE_MONTHS: 90, ONE_MONTH: 30 },
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  PolicyStatement: jest.fn().mockImplementation((props: unknown) => ({
    type: 'PolicyStatement',
    props,
  })),
}));

const mockRuleCtor = jest.fn();

jest.mock('aws-cdk-lib/aws-events', () => ({
  Rule: jest
    .fn()
    .mockImplementation((_s: unknown, id: string, props: unknown) => {
      mockRuleCtor(id, props);
      return {};
    }),
  RuleTargetInput: {
    fromObject: jest.fn().mockImplementation((o: unknown) => ({ input: o })),
  },
  EventField: { fromPath: jest.fn().mockImplementation((p: string) => p) },
}));

jest.mock('aws-cdk-lib/aws-events-targets', () => ({
  SfnStateMachine: jest
    .fn()
    .mockImplementation((_sm: unknown, props: unknown) => ({ props })),
}));

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const app = { node: { tryGetContext: jest.fn(), children: [] } };

const defaultProps = {
  version: 'v2',
  stackName: 'StepFunctionsImageProcess',
  description: 'Image process state machine',
  stage: 'dev',
};

const createStack = (overrides: Record<string, unknown> = {}) =>
  new StepFunctionsImageProcessStack(
    app as unknown as Construct,
    'ImageProcessStack',
    { ...defaultProps, ...overrides },
  );

const lambdaProps = (fnName: string) => {
  const { NodejsFunction: MockFn } = jest.requireMock<
    Record<string, jest.Mock>
  >('aws-cdk-lib/aws-lambda-nodejs');
  const call = (MockFn as jest.Mock).mock.calls.find(
    (c: unknown[]) =>
      (c[2] as { functionName: string }).functionName === fnName,
  );
  return call?.[2] as Record<string, unknown> | undefined;
};

describe('StepFunctionsImageProcessStack', () => {
  beforeEach(() => jest.clearAllMocks());

  test('instantiates without throwing', () => {
    expect(createStack).not.toThrow();
  });

  test('creates the three task Lambdas with stage-prefixed names', () => {
    createStack();
    const { NodejsFunction: MockFn } = jest.requireMock<
      Record<string, jest.Mock>
    >('aws-cdk-lib/aws-lambda-nodejs');
    const names = (MockFn as jest.Mock).mock.calls.map(
      (c: unknown[]) => (c[2] as { functionName: string }).functionName,
    );
    expect(names).toEqual([
      'fm-dev-chat-probe-image',
      'fm-dev-chat-convert-image',
      'fm-dev-chat-publish-attachment',
    ]);
  });

  describe('sharp bundling', () => {
    test('SHARP_VERSION matches the pnpm catalog', () => {
      // The Lambda installs sharp by explicit version, so a catalog bump that
      // forgets this constant would ship a different binary than the one the
      // unit tests exercise.
      const workspace = readFileSync(
        join(__dirname, '../../../../pnpm-workspace.yaml'),
        'utf8',
      );
      const match = /^\s+sharp:\s*\^?(\S+)\s*$/m.exec(workspace);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(SHARP_VERSION);
    });

    test('marks sharp external and installs the LINUX binary explicitly', () => {
      createStack();
      const props = lambdaProps('fm-dev-chat-convert-image');
      const bundling = props!['bundling'] as {
        externalModules: string[];
        commandHooks: {
          afterBundling: (i: string, o: string) => string[];
        };
      };

      // esbuild must never bundle a native module.
      expect(bundling.externalModules).toContain('sharp');

      const commands = bundling.commandHooks.afterBundling('/in', '/out');
      expect(commands).toHaveLength(1);
      // Without the platform overrides a macOS build installs
      // @img/sharp-darwin-arm64 and the function throws at runtime.
      expect(commands[0]).toContain('--os=linux');
      expect(commands[0]).toContain('--cpu=x64');
      expect(commands[0]).toContain('--libc=glibc');
      expect(commands[0]).toContain(`sharp@${SHARP_VERSION}`);
      // npm, not pnpm: Lambda cannot follow pnpm's symlinks.
      expect(commands[0]).toMatch(/^npm install/);
    });

    test('the flags match the declared Lambda architecture', () => {
      createStack();
      const props = lambdaProps('fm-dev-chat-convert-image');
      expect((props!['architecture'] as { name: string }).name).toBe('x86_64');
    });

    test('does NOT bundle sharp into the publisher Lambda', () => {
      createStack();
      const bundling = lambdaProps('fm-dev-chat-publish-attachment')![
        'bundling'
      ] as Record<string, unknown>;
      expect(bundling['externalModules']).not.toContain('sharp');
      expect(bundling['commandHooks']).toBeUndefined();
    });

    test('gives the convert Lambda enough memory and time for a full bitmap', () => {
      createStack();
      const props = lambdaProps('fm-dev-chat-convert-image');
      expect(props!['memorySize']).toBe(2048);
      expect(props!['timeout']).toEqual({ seconds: 120 });
    });
  });

  describe('IAM — least privilege per role', () => {
    test('probe can only READ raw uploads', () => {
      createStack();
      const statements = mockAddToRolePolicy.mock.calls.map(
        (c: unknown[]) => (c[0] as { props: Record<string, unknown> }).props,
      );
      const reads = statements.filter((p) =>
        (p['actions'] as string[])?.includes('s3:GetObject'),
      );
      expect(reads.length).toBeGreaterThanOrEqual(1);
      for (const stmt of reads) {
        expect((stmt['resources'] as string[])[0]).toContain(
          '/chat-attachments/*',
        );
      }
    });

    test('convert writes ONLY under the ready prefix', () => {
      createStack();
      const statements = mockAddToRolePolicy.mock.calls.map(
        (c: unknown[]) => (c[0] as { props: Record<string, unknown> }).props,
      );
      const writes = statements.filter((p) =>
        (p['actions'] as string[])?.includes('s3:PutObject'),
      );
      expect(writes).toHaveLength(1);
      // It must be unable to overwrite the user's original upload.
      expect((writes[0]!['resources'] as string[])[0]).toContain(
        '/chat-ready/*',
      );
    });

    test('the CopyOriginal task is not granted DeleteObject', () => {
      createStack();
      const copyProps = mockCallAwsServiceCtor.mock.calls[0]?.[1] as {
        iamAction: string;
        iamResources: string[];
      };
      // `s3:*Object` would also hand out DeleteObject on user content.
      expect(copyProps.iamAction).toBe('s3:GetObject');
      expect(copyProps.iamResources[0]).toContain('/chat-attachments/*');

      const smWrites = mockSmAddToRolePolicy.mock.calls.map(
        (c: unknown[]) => (c[0] as { props: Record<string, unknown> }).props,
      );
      expect(smWrites[0]!['actions']).toEqual(['s3:PutObject']);
      expect((smWrites[0]!['resources'] as string[])[0]).toContain(
        '/chat-ready/*',
      );
    });
  });

  describe('EventBridge trigger', () => {
    test('filters on the UPLOAD prefix so the workflow cannot re-trigger itself', () => {
      createStack();
      const props = mockRuleCtor.mock.calls[0]?.[1] as {
        eventPattern: {
          source: string[];
          detailType: string[];
          detail: { object: { key: Array<{ prefix: string }> } };
        };
      };
      expect(props.eventPattern.source).toEqual(['aws.s3']);
      expect(props.eventPattern.detailType).toEqual(['Object Created']);
      // The normalized object is written to the SAME bucket — without this
      // filter its own ObjectCreated event would start the workflow again.
      expect(props.eventPattern.detail.object.key[0]!.prefix).toBe(
        'chat-attachments/',
      );
    });

    test('reshapes the S3 event into the workflow input contract', () => {
      createStack();
      const { RuleTargetInput } = jest.requireMock<Record<string, jest.Mock>>(
        'aws-cdk-lib/aws-events',
      );
      expect(
        (RuleTargetInput as unknown as { fromObject: jest.Mock }).fromObject,
      ).toHaveBeenCalledWith({ uploadKey: '$.detail.object.key' });
    });
  });

  describe('state machine', () => {
    test('uses a short timeout — nothing here waits on a human', () => {
      createStack();
      const props = mockStateMachineCtor.mock.calls[0]?.[1] as {
        timeout: { minutes: number };
        stateMachineName: string;
      };
      expect(props.timeout).toEqual({ minutes: 10 });
      expect(props.stateMachineName).toBe('fm-dev-image-process');
    });

    test('routes every fallible task to the catch-all', () => {
      createStack();
      const catches = mockAddCatch.mock.calls.filter((c: unknown[]) => {
        const opts = c[1] as { errors?: string[] } | undefined;
        return opts?.errors?.includes('States.ALL');
      });
      // Probe, Convert, CopyOriginal, PublishReady. PublishRejected has none —
      // it IS the error-reporting path.
      expect(catches).toHaveLength(4);
      expect((catches[0]![1] as { resultPath: string }).resultPath).toBe(
        '$.error',
      );
    });

    test('recovers the owner from the upload key on the failure path', () => {
      createStack();
      const { Pass: MockPass } = jest.requireMock(
        'aws-cdk-lib/aws-stepfunctions',
      ) as { Pass: jest.Mock };
      const call = MockPass.mock.calls.find(
        (c: unknown[]) => c[1] === 'ResolveOwnerFromKey',
      );
      expect(call).toBeDefined();
      const params = (call![2] as { parameters: Record<string, string> })
        .parameters;
      // `$.probe.userId` is unavailable when Probe itself is what failed, so the
      // owner has to come from the key, which is always in the input.
      expect(params['userId.$']).toContain('States.StringSplit($.uploadKey');
    });

    test('prod logs only ERROR states (cost control)', () => {
      createStack({ stage: 'prod' });
      const props = mockStateMachineCtor.mock.calls[0]?.[1] as {
        logs: { level: string };
      };
      expect(props.logs.level).toBe('ERROR');
    });
  });

  test('exports the state machine arn and all three Lambda names', () => {
    createStack();
    const { exportForCrossVersion } = jest.requireMock<
      Record<string, jest.Mock>
    >('@utils/cross-version');
    const keys = (exportForCrossVersion as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[1] as string,
    );
    expect(keys).toEqual([
      'StateMachineArn',
      'ProbeImageFnName',
      'ConvertImageFnName',
      'PublishAttachmentFnName',
    ]);
  });
});
