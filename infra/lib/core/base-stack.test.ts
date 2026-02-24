import { buildBaseStackProps, BaseStackProps } from './base-stack';

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
