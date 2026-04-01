import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';
import { LinkExistingProvidersUseCase } from './link-existing-providers.use-case';

function makePort(overrides: Partial<CognitoAdminPort> = {}): CognitoAdminPort {
  return {
    listUsersByEmail: jest.fn().mockResolvedValue([]),
    linkProviderToUser: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const input = {
  userPoolId: 'us-east-1_test',
  email: 'test@example.com',
  nativeUsername: 'native-uuid-user',
};

describe('LinkExistingProvidersUseCase', () => {
  it('deletes social users before linking them to native user', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_111',
          attributes: { email: 'test@example.com' },
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    // Delete must be called BEFORE link
    expect(port.deleteUser).toHaveBeenCalledWith(
      'us-east-1_test',
      'Google_111',
    );
    expect(port.linkProviderToUser).toHaveBeenCalledWith(
      'us-east-1_test',
      'native-uuid-user',
      'Google',
      '111',
    );
    expect(result.action).toBe('linked');
    expect(result.linkedProviders).toEqual(['Google']);
  });

  it('deletes and links multiple social providers', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_111',
          attributes: {},
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
        {
          username: 'Facebook_222',
          attributes: {},
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(port.deleteUser).toHaveBeenCalledTimes(2);
    expect(port.linkProviderToUser).toHaveBeenCalledTimes(2);
    expect(result.linkedProviders).toEqual(['Google', 'Facebook']);
  });

  it('calls delete before link for each social user', async () => {
    const callOrder: string[] = [];
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'Google_111',
          attributes: {},
          enabled: true,
          status: 'EXTERNAL_PROVIDER',
        },
      ]),
      deleteUser: jest.fn().mockImplementation(() => {
        callOrder.push('delete');
        return Promise.resolve();
      }),
      linkProviderToUser: jest.fn().mockImplementation(() => {
        callOrder.push('link');
        return Promise.resolve();
      }),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    await useCase.execute(input);

    expect(callOrder).toEqual(['delete', 'link']);
  });

  it('skips when no social users exist', async () => {
    const port = makePort();
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(port.deleteUser).not.toHaveBeenCalled();
    expect(port.linkProviderToUser).not.toHaveBeenCalled();
  });

  it('ignores native users in the list', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockResolvedValue([
        {
          username: 'another-native-uuid',
          attributes: {},
          enabled: true,
          status: 'CONFIRMED',
        },
      ]),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    const result = await useCase.execute(input);

    expect(result.action).toBe('skipped');
    expect(port.deleteUser).not.toHaveBeenCalled();
  });

  it('propagates errors', async () => {
    const port = makePort({
      listUsersByEmail: jest.fn().mockRejectedValue(new Error('Cognito error')),
    });
    const useCase = new LinkExistingProvidersUseCase(port);
    await expect(useCase.execute(input)).rejects.toThrow('Cognito error');
  });
});
