import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  exportNameFor,
  exportForCrossVersion,
  importFromVersion,
} from './cross-version';

describe('exportNameFor', () => {
  test('returns formatted export name with prefix, version, stack and key', () => {
    expect(exportNameFor('v1', 'Auth', 'UserPoolId')).toBe(
      'FinancialManagement-v1-Auth-UserPoolId',
    );
  });

  test('uses different version and stack name', () => {
    expect(exportNameFor('v2', 'Networking', 'VpcId')).toBe(
      'FinancialManagement-v2-Networking-VpcId',
    );
  });

  test('is consistent for same inputs', () => {
    const a = exportNameFor('v1', 'Database', 'ClusterArn');
    const b = exportNameFor('v1', 'Database', 'ClusterArn');
    expect(a).toBe(b);
  });
});

describe('exportForCrossVersion', () => {
  test('adds CfnOutput with correct export name and value', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    exportForCrossVersion(
      stack,
      'UserPoolId',
      'us-east-1_abc123',
      'v1',
      'Auth',
    );
    const template = Template.fromStack(stack);
    const outputs = template.findOutputs('*');
    const outputKeys = Object.keys(outputs);
    expect(outputKeys.length).toBeGreaterThanOrEqual(1);
    const out = Object.values(outputs).find(
      (o) => o.Export?.Name === 'FinancialManagement-v1-Auth-UserPoolId',
    );
    expect(out).toBeDefined();
    expect(out?.Value).toBe('us-east-1_abc123');
  });

  test('output description mentions version', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    exportForCrossVersion(stack, 'VpcId', 'vpc-123', 'v1', 'Networking');
    const template = Template.fromStack(stack);
    const outputs = template.findOutputs('*');
    const out = Object.values(outputs)[0];
    expect(out?.Description).toContain('v1');
    expect(out?.Value).toBe('vpc-123');
  });
});

describe('importFromVersion', () => {
  test('returns Fn.importValue token with correct export name', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const token = importFromVersion(stack, 'v1', 'Auth', 'UserPoolId');
    expect(token).toBeDefined();
    expect(cdk.Token.isUnresolved(token)).toBe(true);
  });

  test('import name matches exportNameFor', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const token = importFromVersion(stack, 'v1', 'Database', 'ClusterArn');
    const expectedName = exportNameFor('v1', 'Database', 'ClusterArn');
    const resolved = stack.resolve(token);
    expect(resolved).toHaveProperty('Fn::ImportValue');
    expect((resolved as { 'Fn::ImportValue': string })['Fn::ImportValue']).toBe(
      expectedName,
    );
  });
});
