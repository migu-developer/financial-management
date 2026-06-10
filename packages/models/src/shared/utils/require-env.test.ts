import { requireEnv } from './require-env';

describe('requireEnv', () => {
  it('returns the value when present', () => {
    expect(requireEnv('arn:aws:states:...', 'CHAT_STATE_MACHINE_ARN')).toBe(
      'arn:aws:states:...',
    );
  });

  it('throws naming the variable when undefined', () => {
    expect(() => requireEnv(undefined, 'APPSYNC_HTTP_DNS')).toThrow(
      'Environment variable APPSYNC_HTTP_DNS is not configured.',
    );
  });

  it('throws when the value is an empty string', () => {
    expect(() => requireEnv('', 'APPSYNC_CHAT_NAMESPACE')).toThrow(
      'Environment variable APPSYNC_CHAT_NAMESPACE is not configured.',
    );
  });
});
