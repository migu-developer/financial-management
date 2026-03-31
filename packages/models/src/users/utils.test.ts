import { DataNotDefinedError } from '@packages/models/shared/utils/errors/services';
import { getUserProfile } from './utils';
import { UserProfile } from './types';

describe('getUserProfile', () => {
  it('should return a user profile', () => {
    const authorizer = {
      sub: '123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
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

    const userProfile = getUserProfile(authorizer);

    const expectedUserProfile: Partial<UserProfile> & { sub: string } =
      structuredClone(authorizer);
    expectedUserProfile.uid = authorizer.sub;
    expectedUserProfile.id = authorizer.sub;
    delete (expectedUserProfile as { sub?: string }).sub;

    expect(userProfile).toEqual(expectedUserProfile);
  });

  it('should throw a DataNotDefinedError if authorizer is not provided', () => {
    expect(() =>
      getUserProfile(undefined as unknown as { [key: string]: unknown }),
    ).toThrow(DataNotDefinedError);
  });
});
