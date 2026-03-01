import {
  exportNameFor,
  exportForCrossVersion,
  importFromVersion,
} from './cross-version';
import { Construct } from 'constructs';

const mockCfnOutput = jest.fn();
const mockImportValue = jest.fn().mockReturnValue('mock-import-token');

jest.mock('aws-cdk-lib', () => ({
  CfnOutput: function (...args: unknown[]) {
    mockCfnOutput(...args);
  },
  Fn: {
    importValue: (name: string) => mockImportValue(name),
  },
}));

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
  beforeEach(() => mockCfnOutput.mockClear());

  test('calls CfnOutput with correct export name and value', () => {
    const mockScope = { node: {} };
    exportForCrossVersion(
      mockScope as Construct,
      'UserPoolId',
      'us-east-1_abc123',
      'v1',
      'Auth',
    );
    expect(mockCfnOutput).toHaveBeenCalledTimes(1);
    expect(mockCfnOutput).toHaveBeenCalledWith(
      mockScope,
      'CrossVersionExport-UserPoolId',
      expect.objectContaining({
        value: 'us-east-1_abc123',
        exportName: 'FinancialManagement-v1-Auth-UserPoolId',
        description: expect.stringContaining('v1'),
      }),
    );
  });

  test('description mentions version', () => {
    const mockScope = { node: {} };
    exportForCrossVersion(
      mockScope as Construct,
      'VpcId',
      'vpc-123',
      'v1',
      'Networking',
    );
    const call = mockCfnOutput.mock.calls[0][2];
    expect(call.description).toContain('v1');
    expect(call.value).toBe('vpc-123');
  });
});

describe('importFromVersion', () => {
  beforeEach(() => mockImportValue.mockClear());

  test('calls Fn.importValue with export name from exportNameFor', () => {
    const mockScope = { node: {} };
    const result = importFromVersion(
      mockScope as Construct,
      'v1',
      'Auth',
      'UserPoolId',
    );
    expect(mockImportValue).toHaveBeenCalledWith(
      'FinancialManagement-v1-Auth-UserPoolId',
    );
    expect(result).toBe('mock-import-token');
  });

  test('uses same naming as exportNameFor for Database', () => {
    const mockScope = { node: {} };
    importFromVersion(mockScope as Construct, 'v1', 'Database', 'ClusterArn');
    expect(mockImportValue).toHaveBeenCalledWith(
      exportNameFor('v1', 'Database', 'ClusterArn'),
    );
  });
});
