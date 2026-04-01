import type {
  CreateUserInput,
  PatchUserInput,
} from '@packages/models/users/types';

export function mapToCreateInput(
  attrs: Record<string, string>,
): CreateUserInput {
  return {
    uid: attrs['sub']!,
    email: attrs['email']!,
    ...(attrs['given_name'] && { first_name: attrs['given_name'] }),
    ...(attrs['family_name'] && { last_name: attrs['family_name'] }),
    ...(attrs['locale'] && { locale: attrs['locale'] }),
    ...(attrs['picture'] && { picture: attrs['picture'] }),
    ...(attrs['phone_number'] && { phone: attrs['phone_number'] }),
    ...(attrs['identities'] && { identities: attrs['identities'] }),
  };
}

export function mapToPatchInput(attrs: Record<string, string>): PatchUserInput {
  return {
    ...(attrs['given_name'] && { first_name: attrs['given_name'] }),
    ...(attrs['family_name'] && { last_name: attrs['family_name'] }),
    ...(attrs['locale'] && { locale: attrs['locale'] }),
    ...(attrs['picture'] && { picture: attrs['picture'] }),
    ...(attrs['phone_number'] && { phone: attrs['phone_number'] }),
  };
}
