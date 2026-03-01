/**
 * Version to deploy. Change this value to switch which version is synthesized and deployed.
 * Must be one of the keys in config/versions (e.g. 'v1', 'v2').
 *
 * Usage: set DEPLOY_VERSION to the version you want, then run:
 *   pnpm cdk deploy --all
 *   pnpm cdk synth
 */
export const DEPLOY_VERSION: string | undefined = 'v2';
