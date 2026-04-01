import { DataNotDefinedError } from '@packages/models/shared/utils/errors/services';
import type { UserProfile } from './types';

export const getUserProfile = (data: {
  [key: string]: unknown;
}): UserProfile => {
  if (!data) {
    throw new DataNotDefinedError('data is required');
  }

  const data_processed: { [key: string]: unknown } = data['claims']
    ? (data['claims'] as { [key: string]: unknown })
    : (data as { [key: string]: unknown });

  return {
    id: data_processed['sub'],
    uid: data_processed['sub'],
    email: data_processed['email'],
    first_name: data_processed['first_name'] ?? data_processed['given_name'],
    last_name: data_processed['last_name'] ?? data_processed['family_name'],
    identities: data_processed['identities'],
    locale: data_processed['locale'],
    picture: data_processed['picture'],
    phone: data_processed['phone'],
    document_id: data_processed['document_id'],
    email_verified: data_processed['email_verified'],
    phone_verified: data_processed['phone_verified'],
    provider_id: data_processed['provider_id'],
    created_at: data_processed['created_at'],
    updated_at: data_processed['updated_at'],
    created_by: data_processed['created_by'],
    modified_by: data_processed['modified_by'],
  } as UserProfile;
};
