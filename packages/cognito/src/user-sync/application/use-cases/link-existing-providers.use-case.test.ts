import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';
import { LinkExistingProvidersUseCase } from './link-existing-providers.use-case';

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
  nativeUsername: 'native-uuid-user',
};

describe('LinkExistingProvidersUseCase', () => {
  it('links all social providers to native user', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_111',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
        {
          username: 'Facebook_222',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('linked');
    expect(result.linkedProviders).toEqual(['Google', 'Facebook']);
    expect(port.linkProviderToUser).toHaveBeenCalledTimes(2);
    expect(port.linkProviderToUser).toHaveBeenCalledWith(
      'us-east-1_test',
      'native-uuid-user',
      'Google',
      '111',
    );
    expect(port.linkProviderToUser).toHaveBeenCalledWith(
      'us-east-1_test',
      'native-uuid-user',
      'Facebook',
      '222',
    );
  });

  it('skips when no social users exist', async () => {
    const port = makePort();
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(result.linkedProviders).toEqual([]);
    expect(port.linkProviderToUser).not.toHaveBeenCalled();
  });

  it('ignores native users in the list', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'another-native-uuid',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'CONFIRMED',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(port.linkProviderToUser).not.toHaveBeenCalled();
  });

  it('only links social users, not native ones', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_111',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
        {
          username: 'some-other-native',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'CONFIRMED',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('linked');
    expect(result.linkedProviders).toEqual(['Google']);
    expect(port.linkProviderToUser).toHaveBeenCalledTimes(1);
  });

  it('propagates errors', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockRejectedValue(new Error('Cognito error')),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    await expect(useCase.execute(input)).rejects.toThrow('Cognito error');
  });
});
