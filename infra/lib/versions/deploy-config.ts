/**
 * Versions to deploy. All versions in this array will be synthesized and deployed.
 * Each entry must be a key in config/versions (e.g. 'v1', 'v2').
 *
 * Usage: add or remove versions from the array, then run:
 *   pnpm cdk deploy --all
 *   pnpm cdk synth
 */
export const DEPLOY_VERSIONS: string[] = ['v1', 'v2'];
