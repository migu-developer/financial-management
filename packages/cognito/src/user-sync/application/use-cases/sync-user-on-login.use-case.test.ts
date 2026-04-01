import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';
import { SyncUserOnLoginUseCase } from './sync-user-on-login.use-case';
import type {
  CreateUserInput,
  PatchUserInput,
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

const uid = 'a0000000-0000-0000-0000-000000000001';

const createInput: CreateUserInput = {
  uid,
  email: 'test@example.com',
  first_name: 'Miguel',
};

const patchInput: PatchUserInput = {
  first_name: 'Miguel',
  last_name: 'Gutierrez',
  locale: 'en',
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

describe('SyncUserOnLoginUseCase', () => {
  it('patches user when found', async () => {
    const port = makePort({
      findByUid: jest.fn().mockResolvedValue(mockUser),
    });
    const useCase = new SyncUserOnLoginUseCase(port);

    const result = await useCase.execute(
      uid,
      createInput,
      patchInput,
      'test@example.com',
    );

    expect(port.findByUid).toHaveBeenCalledWith(uid);
    expect(port.patch).toHaveBeenCalledWith(
      uid,
      patchInput,
      'test@example.com',
    );
    expect(port.create).not.toHaveBeenCalled();
    expect(result.action).toBe('updated');
    expect(result.user).toBe(mockUser);
  });

  it('creates user on first login when not found', async () => {
    const port = makePort();
    const useCase = new SyncUserOnLoginUseCase(port);

    const result = await useCase.execute(
      uid,
      createInput,
      patchInput,
      'test@example.com',
    );

    expect(port.findByUid).toHaveBeenCalledWith(uid);
    expect(port.create).toHaveBeenCalledWith(createInput, 'test@example.com');
    expect(port.patch).not.toHaveBeenCalled();
    expect(result.action).toBe('created');
    expect(result.user).toBe(mockUser);
  });

  it('propagates repository errors', async () => {
    const port = makePort({
      findByUid: jest.fn().mockRejectedValue(new Error('Connection lost')),
    });
    const useCase = new SyncUserOnLoginUseCase(port);

    await expect(
      useCase.execute(uid, createInput, patchInput, 'test@example.com'),
    ).rejects.toThrow('Connection lost');
  });
});
