/**
 * Error names AWS reports when a call is being rate-limited.
 *
 * Lives in `@packages/models` because it is a contract shared by BOTH the CDK
 * stacks (the Step Functions retrier matches on these names) and the services
 * (which count them as a throttle metric). `infra` cannot import from
 * `@services/*`, so a single definition has to sit here — otherwise the two
 * lists drift and a throttle gets retried but never counted, or vice versa.
 */
export const THROTTLE_ERROR_NAMES = [
  'ThrottlingException',
  'ProvisionedThroughputExceededException',
  'LimitExceededException',
  'TooManyRequestsException',
] as const;

export type ThrottleErrorName = (typeof THROTTLE_ERROR_NAMES)[number];
