/**
 * Recognises AWS rate-limit failures.
 *
 * Lives in `infrastructure` because it inspects AWS SDK error shapes
 * (`$metadata.httpStatusCode`), which is not domain knowledge — and in its own
 * module rather than inside the handler so it can be tested without importing
 * a file that calls `requireEnv` at module scope.
 *
 * The NAMES it matches on live in `@packages/models` because the CDK retrier
 * needs the same list and `infra` cannot import from `@services/*`.
 */
import { THROTTLE_ERROR_NAMES } from '@packages/models/shared/utils/throttle-errors';

export { THROTTLE_ERROR_NAMES };

/** True when the error is AWS refusing because of a rate limit. */
export const isThrottleError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;

  const name = (error as { name?: unknown }).name;
  if (
    typeof name === 'string' &&
    (THROTTLE_ERROR_NAMES as readonly string[]).includes(name)
  ) {
    return true;
  }

  // Some SDK errors only carry the status code; 429 is unambiguous.
  const status = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata?.httpStatusCode;
  return status === 429;
};
