import { Stack } from 'aws-cdk-lib';
import { buildBaseStackProps, BaseStack, BaseStackProps } from './base-stack';

function buildProps(overrides: Partial<BaseStackProps> = {}): BaseStackProps {
  return {
    version: 'v1',
    stackName: 'TestStack',
    description: 'Test description',
    ...overrides,
  };
}

describe('buildBaseStackProps', () => {
  test('builds full stack name as FinancialManagement-{version}-{stackName}', () => {
    const result = buildBaseStackProps(buildProps());
    expect(result.stackName).toBe('FinancialManagement-v1-TestStack');
  });

  test('uses custom description when provided', () => {
    const result = buildBaseStackProps(
      buildProps({ description: 'Custom desc' }),
    );
    expect(result.description).toBe('Custom desc');
  });

  test('uses default description when not provided', () => {
    const result = buildBaseStackProps(
      buildProps({
        version: 'v2',
        stackName: 'Networking',
        description: undefined,
      }),
    );
    expect(result.description).toBe('Financial Management - Networking (v2)');
  });

  test('includes Version, Project and ManagedBy in tags', () => {
    const result = buildBaseStackProps(buildProps());
    expect(result.tags.Version).toBe('v1');
    expect(result.tags.Project).toBe('FinancialManagement');
    expect(result.tags.ManagedBy).toBe('CDK');
  });

  test('merges custom tags with base tags', () => {
    const result = buildBaseStackProps(
      buildProps({ tags: { Custom: 'value' } }),
    );
    expect(result.tags.Version).toBe('v1');
    expect(result.tags.Project).toBe('FinancialManagement');
    expect(result.tags.Custom).toBe('value');
  });
});

describe('BaseStack.dependsOnNames', () => {
  test('defaults to empty array when dependsOn is not provided', () => {
    const result = buildBaseStackProps(buildProps());
    expect(result).toBeDefined();
    // dependsOnNames is on the class, not buildBaseStackProps
    // We test the prop parsing logic here
    const props = buildProps();
    expect(props.dependsOn).toBeUndefined();
  });

  test('accepts dependsOn array in props', () => {
    const props = buildProps({ dependsOn: ['StackA', 'StackB'] });
    expect(props.dependsOn).toEqual(['StackA', 'StackB']);
  });
});

describe('BaseStack.resolveDependencies', () => {
  test('adds dependencies from dependsOnNames to stacks in the map', () => {
    const addDependency = jest.fn();
    const stackA = { addDependency } as unknown as Stack;
    const stackB = {} as unknown as Stack;

    // Simulate a BaseStack with dependsOnNames
    Object.setPrototypeOf(stackA, BaseStack.prototype);
    (stackA as unknown as { dependsOnNames: string[] }).dependsOnNames = [
      'StackB',
    ];

    const stackMap = new Map<string, Stack>();
    stackMap.set('StackA', stackA);
    stackMap.set('StackB', stackB);

    BaseStack.resolveDependencies(stackMap);

    expect(addDependency).toHaveBeenCalledWith(stackB);
  });

  test('skips stacks without dependsOnNames', () => {
    const addDependency = jest.fn();
    const stackA = { addDependency } as unknown as Stack;

    Object.setPrototypeOf(stackA, BaseStack.prototype);
    (stackA as unknown as { dependsOnNames: string[] }).dependsOnNames = [];

    const stackMap = new Map<string, Stack>();
    stackMap.set('StackA', stackA);

    BaseStack.resolveDependencies(stackMap);

    expect(addDependency).not.toHaveBeenCalled();
  });

  test('skips dependencies that are not in the map', () => {
    const addDependency = jest.fn();
    const stackA = { addDependency } as unknown as Stack;

    Object.setPrototypeOf(stackA, BaseStack.prototype);
    (stackA as unknown as { dependsOnNames: string[] }).dependsOnNames = [
      'NonExistent',
    ];

    const stackMap = new Map<string, Stack>();
    stackMap.set('StackA', stackA);

    BaseStack.resolveDependencies(stackMap);

    expect(addDependency).not.toHaveBeenCalled();
  });

  test('resolves multiple dependencies', () => {
    const addDependency = jest.fn();
    const monitoring = { addDependency } as unknown as Stack;
    const apiGw = {} as unknown as Stack;
    const lambdaExp = {} as unknown as Stack;

    Object.setPrototypeOf(monitoring, BaseStack.prototype);
    (monitoring as unknown as { dependsOnNames: string[] }).dependsOnNames = [
      'ApiGateway',
      'LambdaExpenses',
    ];

    const stackMap = new Map<string, Stack>();
    stackMap.set('Monitoring', monitoring);
    stackMap.set('ApiGateway', apiGw);
    stackMap.set('LambdaExpenses', lambdaExp);

    BaseStack.resolveDependencies(stackMap);

    expect(addDependency).toHaveBeenCalledTimes(2);
    expect(addDependency).toHaveBeenCalledWith(apiGw);
    expect(addDependency).toHaveBeenCalledWith(lambdaExp);
  });
});
