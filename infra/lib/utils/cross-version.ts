import { CfnOutput, Fn } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

const PROJECT_PREFIX = 'FinancialManagement';

/**
 * Builds the CloudFormation export name used for cross-version references.
 * Use this so v2 (or later) can import outputs from a previously deployed v1 stack.
 */
export function exportNameFor(
  version: string,
  stackName: string,
  outputKey: string,
): string {
  return `${PROJECT_PREFIX}-${version}-${stackName}-${outputKey}`;
}

/**
 * Adds a CfnOutput with a stable export name so other versions can import it.
 * Call this from a stack that provides outputs for cross-version consumption (e.g. v1 Networking).
 *
 * @param scope - Usually `this` inside the stack
 * @param outputKey - Logical key (e.g. 'VpcId', 'ApiUrl'). Used in importFromVersion.
 * @param value - The value to export (string or token)
 * @param version - This stack's version (e.g. 'v1')
 * @param stackShortName - This stack's short name (e.g. 'Networking')
 */
export function exportForCrossVersion(
  scope: Construct,
  outputKey: string,
  value: string,
  version: string,
  stackShortName: string,
): void {
  const exportName = exportNameFor(version, stackShortName, outputKey);
  new CfnOutput(scope, `CrossVersionExport-${outputKey}`, {
    value,
    description: `Exported for cross-version use (${version}).`,
    exportName,
  });
}

/**
 * Imports a value exported by a stack from another version (e.g. v1).
 * Use in a v2 stack when it depends on an output from an already-deployed v1 stack.
 *
 * @param _scope - Construct scope (for token resolution)
 * @param fromVersion - Version that exports the value (e.g. 'v1')
 * @param stackShortName - Short name of the stack that exported it (e.g. 'Networking')
 * @param outputKey - Key used when calling exportForCrossVersion (e.g. 'VpcId')
 * @returns Token that resolves to the exported value at deploy time
 */
export function importFromVersion(
  _scope: Construct,
  fromVersion: string,
  stackShortName: string,
  outputKey: string,
): string {
  const exportName = exportNameFor(fromVersion, stackShortName, outputKey);
  return Fn.importValue(exportName);
}
