import { DataNotDefinedError } from '@packages/models/shared/utils/errors/services';
import type { UserProfile } from './types';

export const getUserProfile = (data: {
  [key: string]: unknown;
}): UserProfile => {
  if (!data) {
    throw new DataNotDefinedError('data is required');
  }

  return {
    id: data['sub'],
    uid: data['sub'],
    email: data['email'],
    first_name: data['first_name'],
    last_name: data['last_name'],
    identities: data['identities'],
    locale: data['locale'],
    picture: data['picture'],
    phone: data['phone'],
    document_id: data['document_id'],
    email_verified: data['email_verified'],
    phone_verified: data['phone_verified'],
    provider_id: data['provider_id'],
    created_at: data['created_at'],
    updated_at: data['updated_at'],
    created_by: data['created_by'],
    modified_by: data['modified_by'],
  } as UserProfile;
};
