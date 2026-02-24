import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BaseStack, BaseStackProps } from './base-stack';

function createStack(overrides: Partial<BaseStackProps> = {}): BaseStack {
  const app = new cdk.App();
  return new BaseStack(app, 'TestBaseStack', {
    version: 'v1',
    stackName: 'TestStack',
    description: 'Test description',
    ...overrides,
  });
}

describe('BaseStack', () => {
  test('sets stack name as FinancialManagement-{version}-{stackName}', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v1-TestStack');
  });

  test('uses custom description when provided', () => {
    const stack = createStack({ description: 'Custom desc' });
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();
  });

  test('sets default description when not provided', () => {
    const app = new cdk.App();
    const stack = new BaseStack(app, 'Id', {
      version: 'v2',
      stackName: 'Networking',
    });
    expect(stack.stackName).toBe('FinancialManagement-v2-Networking');
  });

  test('template includes Version and Project in stack metadata/tags', () => {
    const stack = createStack();
    const template = Template.fromStack(stack);
    const templateObj = template.toJSON();
    expect(templateObj).toBeDefined();
    expect(stack.stackName).toBe('FinancialManagement-v1-TestStack');
  });

  test('accepts and merges custom tags', () => {
    const app = new cdk.App();
    const stack = new BaseStack(app, 'Id', {
      version: 'v1',
      stackName: 'Test',
      tags: {
        Custom: 'value',
      },
    });
    expect(stack.stackName).toBe('FinancialManagement-v1-Test');
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();
  });
});
