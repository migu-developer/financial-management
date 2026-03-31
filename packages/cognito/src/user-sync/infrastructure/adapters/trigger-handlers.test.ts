import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';
import type { UserProfile } from '@packages/models/users/types';
import { TRIGGER_HANDLERS } from './trigger-handlers';

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

const attrs: Record<string, string> = {
  sub: 'a0000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  given_name: 'Miguel',
  family_name: 'Gutierrez',
  locale: 'en',
  picture: 'https://example.com/photo.jpg',
  phone_number: '+573001234567',
};

function makePort(overrides: Partial<UserSyncPort> = {}): UserSyncPort {
  return {
    findByUid: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockUser),
    patch: jest.fn().mockResolvedValue(mockUser),
    ...overrides,
  };
}

describe('TRIGGER_HANDLERS', () => {
  it('has handlers for PostConfirmation_ConfirmSignUp and PostAuthentication_Authentication', () => {
    expect(TRIGGER_HANDLERS.PostConfirmation_ConfirmSignUp).toBeDefined();
    expect(TRIGGER_HANDLERS.PostAuthentication_Authentication).toBeDefined();
  });

  it('does not have a handler for PostConfirmation_ConfirmForgotPassword', () => {
    expect(
      TRIGGER_HANDLERS.PostConfirmation_ConfirmForgotPassword,
    ).toBeUndefined();
  });

  describe('PostConfirmation_ConfirmSignUp', () => {
    const handle = TRIGGER_HANDLERS.PostConfirmation_ConfirmSignUp!;

    it('creates user when not found and returns "created"', async () => {
      const port = makePort();
      const action = await handle(attrs, port);

      expect(port.findByUid).toHaveBeenCalledWith(attrs['sub']);
      expect(port.create).toHaveBeenCalledWith(
        expect.objectContaining({ uid: attrs['sub'], email: attrs['email'] }),
        attrs['email'],
      );
      expect(action).toBe('created');
    });

    it('skips create when user exists and returns "skipped"', async () => {
      const port = makePort({
        findByUid: jest.fn().mockResolvedValue(mockUser),
      });
      const action = await handle(attrs, port);

      expect(port.create).not.toHaveBeenCalled();
      expect(action).toBe('skipped');
    });

    it('maps cognito attributes to CreateUserInput', async () => {
      const port = makePort();
      await handle(attrs, port);

      expect(port.create).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Miguel',
          last_name: 'Gutierrez',
          locale: 'en',
          picture: 'https://example.com/photo.jpg',
          phone: '+573001234567',
        }),
        attrs['email'],
      );
    });
  });

  describe('PostAuthentication_Authentication', () => {
    const handle = TRIGGER_HANDLERS.PostAuthentication_Authentication!;

    it('patches user when found and returns "updated"', async () => {
      const port = makePort({
        findByUid: jest.fn().mockResolvedValue(mockUser),
      });
      const action = await handle(attrs, port);

      expect(port.patch).toHaveBeenCalledWith(
        attrs['sub'],
        expect.objectContaining({
          first_name: 'Miguel',
          last_name: 'Gutierrez',
          locale: 'en',
        }),
        attrs['email'],
      );
      expect(port.create).not.toHaveBeenCalled();
      expect(action).toBe('updated');
    });

    it('creates user on first login when not found and returns "created"', async () => {
      const port = makePort();
      const action = await handle(attrs, port);

      expect(port.create).toHaveBeenCalledWith(
        expect.objectContaining({ uid: attrs['sub'], email: attrs['email'] }),
        attrs['email'],
      );
      expect(port.patch).not.toHaveBeenCalled();
      expect(action).toBe('created');
    });

    it('maps cognito attributes to PatchUserInput (no uid/email/identities)', async () => {
      const port = makePort({
        findByUid: jest.fn().mockResolvedValue(mockUser),
      });
      await handle(attrs, port);

      const patchArg = (port.patch as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(patchArg).not.toHaveProperty('uid');
      expect(patchArg).not.toHaveProperty('email');
      expect(patchArg).not.toHaveProperty('identities');
      expect(patchArg.phone).toBe('+573001234567');
    });
  });
});
