import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';
import { SyncUserOnSignupUseCase } from './sync-user-on-signup.use-case';
import type {
  CreateUserInput,
  UserProfile,
} from '@packages/models/users/types';

const mockUser: UserProfile = {
  id: 'user-1',
  uid: 'a0000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  first_name: 'Miguel',
  last_name: 'Gutierrez',
  identities: null,
  locale: 'en',
  picture: null,
  phone: null,
  document_id: null,
  email_verified: false,
  phone_verified: false,
  provider_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'test@example.com',
  modified_by: 'test@example.com',
};

const createInput: CreateUserInput = {
  uid: 'a0000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  first_name: 'Miguel',
};

function makePort(overrides: Partial<UserSyncPort> = {}): UserSyncPort {
  return {
    findByUid: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockUser),
    patch: jest.fn().mockResolvedValue(mockUser),
    updateUid: jest.fn().mockResolvedValue(mockUser),
    ...overrides,
  };
}

describe('SyncUserOnSignupUseCase', () => {
  it('creates user when not found', async () => {
    const port = makePort();
    const useCase = new SyncUserOnSignupUseCase(port);

    const result = await useCase.execute(createInput, 'test@example.com');

    expect(port.findByUid).toHaveBeenCalledWith(createInput.uid);
    expect(port.create).toHaveBeenCalledWith(createInput, 'test@example.com');
    expect(result.action).toBe('created');
    expect(result.user).toBe(mockUser);
  });

  it('skips create when user already exists', async () => {
    const port = makePort({
      findByUid: jest.fn().mockResolvedValue(mockUser),
    });
    const useCase = new SyncUserOnSignupUseCase(port);

    const result = await useCase.execute(createInput, 'test@example.com');

    expect(port.findByUid).toHaveBeenCalledWith(createInput.uid);
    expect(port.create).not.toHaveBeenCalled();
    expect(result.action).toBe('skipped');
    expect(result.user).toBe(mockUser);
  });

  it('does not call patch', async () => {
    const port = makePort();
    const useCase = new SyncUserOnSignupUseCase(port);

    await useCase.execute(createInput, 'test@example.com');

    expect(port.patch).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    const port = makePort({
      findByUid: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const useCase = new SyncUserOnSignupUseCase(port);

    await expect(
      useCase.execute(createInput, 'test@example.com'),
    ).rejects.toThrow('DB error');
  });
});
