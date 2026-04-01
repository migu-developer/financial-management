import type { CognitoAdminPort } from '@pre-signup/domain/ports/cognito-admin.port';
import { LinkProviderUseCase } from './link-provider.use-case';

function makePort(overrides: Partial<CognitoAdminPort> = {}): CognitoAdminPort {
  return {
    listUsersByEmail: jest.fn().mockResolvedValue([]),
    linkProviderToUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const input = {
  userPoolId: 'us-east-1_test',
  email: 'test@example.com',
  providerName: 'Google',
  providerUserId: '106895571745093657038',
};

describe('LinkProviderUseCase', () => {
  it('links provider when native user exists', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'a0000000-0000-0000-0000-000000000001',
          attributes: {
            email: 'test@example.com',
            sub: 'a0000000-0000-0000-0000-000000000001',
          },
          enabled: true,
          status: 'CONFIRMED',
        },
      ]),
    });
    const useCase = new LinkProviderUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('linked');
    expect(result.existingUsername).toBe(
      'a0000000-0000-0000-0000-000000000001',
    );
    expect(port.linkProviderToUser).toHaveBeenCalledWith(
      'us-east-1_test',
      'a0000000-0000-0000-0000-000000000001',
      'Google',
      '106895571745093657038',
    );
  });

  it('skips linking when no native user exists', async () => {
    const port = makePort();
    const useCase = new LinkProviderUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(port.linkProviderToUser).not.toHaveBeenCalled();
  });

  it('skips social-only users (Google_, Facebook_, etc.)', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_999888777',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
      ]),
    });
    const useCase = new LinkProviderUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(port.linkProviderToUser).not.toHaveBeenCalled();
  });

  it('links to native user when both native and social users exist', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Facebook_111222333',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
        {
          username: 'native-uuid-user',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'CONFIRMED',
        },
      ]),
    });
    const useCase = new LinkProviderUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('linked');
    expect(result.existingUsername).toBe('native-uuid-user');
  });

  it('propagates errors from cognitoAdmin', async () => {
    const port = makePort({
      listUsersByEmail: jest
        .fn()
        .mockRejectedValue(new Error('Cognito unavailable')),
    });
    const useCase = new LinkProviderUseCase(port);
    await expect(useCase.execute(input)).rejects.toThrow('Cognito unavailable');
  });
});
