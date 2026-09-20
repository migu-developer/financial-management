import {
  REFRESH_BACKOFF_BASE_MS,
  REFRESH_BACKOFF_MAX_MS,
  refreshBackoffMs,
} from './use-attachment-urls';

/**
 * Only the pure part of the hook is covered here: the repo mocks `react-native`
 * wholesale and ships no React testing library, so the effects themselves are
 * not reachable from Jest. The backoff is the piece that carries real risk —
 * it is what stops a failed renewal from retrying once a second forever.
 */
describe('refreshBackoffMs', () => {
  it('starts at the base delay on the first failure', () => {
    expect(refreshBackoffMs(1)).toBe(REFRESH_BACKOFF_BASE_MS);
  });

  it('doubles with each consecutive failure', () => {
    expect(refreshBackoffMs(2)).toBe(REFRESH_BACKOFF_BASE_MS * 2);
    expect(refreshBackoffMs(3)).toBe(REFRESH_BACKOFF_BASE_MS * 4);
    expect(refreshBackoffMs(4)).toBe(REFRESH_BACKOFF_BASE_MS * 8);
  });

  it('never exceeds the ceiling, however long the outage lasts', () => {
    // Without a cap the doubling overflows into delays measured in days.
    for (const failures of [10, 20, 50, 200]) {
      expect(refreshBackoffMs(failures)).toBe(REFRESH_BACKOFF_MAX_MS);
    }
  });

  it('always returns a delay long enough to not hammer the endpoint', () => {
    // The deadline has already passed when a renewal fails, so the normal
    // "time until due" is negative and would floor to a 1s retry loop.
    for (let failures = 1; failures <= 12; failures += 1) {
      expect(refreshBackoffMs(failures)).toBeGreaterThanOrEqual(
        REFRESH_BACKOFF_BASE_MS,
      );
    }
  });

  it('increases monotonically until it saturates', () => {
    let previous = 0;
    for (let failures = 1; failures <= 8; failures += 1) {
      const delay = refreshBackoffMs(failures);
      expect(delay).toBeGreaterThanOrEqual(previous);
      previous = delay;
    }
  });
});
