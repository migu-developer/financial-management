import { THROTTLE_ERROR_NAMES, isThrottleError } from './throttle-error';

/**
 * This predicate decides whether a failure gets counted as
 * `ChatReceiptThrottled` — the metric that would justify replacing the
 * retry-based approach with a real queue. A wrong answer either hides a real
 * capacity problem or invents one.
 */
describe('isThrottleError', () => {
  it.each(THROTTLE_ERROR_NAMES)('recognises %s by name', (name) => {
    expect(
      isThrottleError(Object.assign(new Error('rate exceeded'), { name })),
    ).toBe(true);
  });

  it('recognises a 429 even when the name is unhelpful', () => {
    const error = Object.assign(new Error('rate exceeded'), {
      name: 'Error',
      $metadata: { httpStatusCode: 429 },
    });

    expect(isThrottleError(error)).toBe(true);
  });

  it('does NOT flag ordinary failures as throttling', () => {
    expect(isThrottleError(new Error('boom'))).toBe(false);
    expect(
      isThrottleError(
        Object.assign(new Error('bad key'), { name: 'BadRequestError' }),
      ),
    ).toBe(false);
  });

  it('does NOT flag a 500 as throttling', () => {
    const error = Object.assign(new Error('server error'), {
      name: 'InternalServerError',
      $metadata: { httpStatusCode: 500 },
    });

    expect(isThrottleError(error)).toBe(false);
  });

  it('survives non-error values without throwing', () => {
    expect(isThrottleError(null)).toBe(false);
    expect(isThrottleError(undefined)).toBe(false);
    expect(isThrottleError('ThrottlingException')).toBe(false);
    expect(isThrottleError(42)).toBe(false);
  });
});
