export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  identities: string | null;
  locale: string | null;
  picture: string | null;
  phone: string | null;
  document_id: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateUserInput {
  uid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  locale?: string;
  picture?: string;
  identities?: string;
  provider_id?: string;
}

export interface PatchUserInput {
  first_name?: string;
  last_name?: string;
  locale?: string;
  picture?: string;
  phone?: string;
  document_id?: string;
}
