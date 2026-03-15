import type { User } from '@features/auth/domain/entities/user';

function makeMinimalUser(): User {
  return {
    userId: 'user-123',
    email: 'user@example.com',
    givenName: 'John',
    fullname: 'John Doe',
    emailVerified: false,
    phoneVerified: false,
  };
}

function makeFullUser(): User {
  return {
    userId: 'user-456',
    email: 'full@example.com',
    givenName: 'Jane',
    fullname: 'Jane Smith',
    phoneNumber: '+573001234567',
    birthdate: '1990-01-15',
    profilePicture: 'https://example.com/avatar.jpg',
    locale: 'es',
    address: 'Bogotá, Colombia',
    lastUpdateTime: new Date('2024-01-01'),
    emailVerified: true,
    phoneVerified: true,
  };
}

describe('User entity', () => {
  describe('required fields', () => {
    it('has userId as non-empty string', () => {
      const user = makeMinimalUser();
      expect(typeof user.userId).toBe('string');
      expect(user.userId.length).toBeGreaterThan(0);
    });

    it('has email as non-empty string', () => {
      const user = makeMinimalUser();
      expect(typeof user.email).toBe('string');
      expect(user.email.length).toBeGreaterThan(0);
    });

    it('has givenName as string', () => {
      const user = makeMinimalUser();
      expect(typeof user.givenName).toBe('string');
    });

    it('has fullname as string', () => {
      const user = makeMinimalUser();
      expect(typeof user.fullname).toBe('string');
    });

    it('has emailVerified as boolean', () => {
      const user = makeMinimalUser();
      expect(typeof user.emailVerified).toBe('boolean');
    });

    it('has phoneVerified as boolean', () => {
      const user = makeMinimalUser();
      expect(typeof user.phoneVerified).toBe('boolean');
    });
  });

  describe('optional fields', () => {
    it('optional fields are undefined on minimal user', () => {
      const user = makeMinimalUser();
      expect(user.phoneNumber).toBeUndefined();
      expect(user.birthdate).toBeUndefined();
      expect(user.profilePicture).toBeUndefined();
      expect(user.locale).toBeUndefined();
      expect(user.address).toBeUndefined();
      expect(user.lastUpdateTime).toBeUndefined();
    });

    it('accepts all optional fields on full user', () => {
      const user = makeFullUser();
      expect(user.phoneNumber).toBe('+573001234567');
      expect(user.birthdate).toBe('1990-01-15');
      expect(user.profilePicture).toBe('https://example.com/avatar.jpg');
      expect(user.locale).toBe('es');
      expect(user.address).toBe('Bogotá, Colombia');
      expect(user.lastUpdateTime).toBeInstanceOf(Date);
    });
  });

  describe('verified states', () => {
    it('unverified user has both flags as false', () => {
      const user = makeMinimalUser();
      expect(user.emailVerified).toBe(false);
      expect(user.phoneVerified).toBe(false);
    });

    it('fully verified user has both flags as true', () => {
      const user = makeFullUser();
      expect(user.emailVerified).toBe(true);
      expect(user.phoneVerified).toBe(true);
    });

    it('email can be verified while phone is not', () => {
      const user: User = {
        ...makeMinimalUser(),
        emailVerified: true,
        phoneVerified: false,
      };
      expect(user.emailVerified).toBe(true);
      expect(user.phoneVerified).toBe(false);
    });
  });
});
