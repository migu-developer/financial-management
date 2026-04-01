import { DataNotDefinedError } from '@packages/models/shared/utils/errors/services';
import { getUserProfile } from './utils';
import { UserProfile } from './types';

function makeUserSimple(): { [key: string]: unknown } {
  return {
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
}

type UserWithSub = Partial<UserProfile> & { sub: string };

describe('getUserProfile', () => {
  it('should return a user profile when authorizer does not have claims', () => {
    const authorizer = makeUserSimple();

    const userProfile = getUserProfile(authorizer);

    const expectedUserProfile: UserWithSub = structuredClone(
      authorizer,
    ) as UserWithSub;
    expectedUserProfile.uid = authorizer.sub as string;
    expectedUserProfile.id = authorizer.sub as string;
    delete (expectedUserProfile as { sub?: string }).sub;

    expect(userProfile).toEqual(expectedUserProfile as UserProfile);
  });

  it('should return a user profile when authorizer has claims', () => {
    const authorizer = makeUserSimple();

    const userProfile = getUserProfile({
      claims: authorizer,
    });

    const expectedUserProfile: UserWithSub = structuredClone(
      authorizer,
    ) as UserWithSub;
    expectedUserProfile.uid = authorizer.sub as string;
    expectedUserProfile.id = authorizer.sub as string;
    delete (expectedUserProfile as { sub?: string }).sub;

    expect(userProfile).toEqual(expectedUserProfile as UserProfile);
  });

  it('should throw a DataNotDefinedError if authorizer is not provided', () => {
    expect(() =>
      getUserProfile(undefined as unknown as { [key: string]: unknown }),
    ).toThrow(DataNotDefinedError);
  });
});
