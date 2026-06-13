/**
 * A chat session persisted in `financial_management.chat_sessions`.
 * Sessions group messages exchanged by a single user.
 */
export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  last_message_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

/**
 * Fields required to create a new chat session.
 * The repository resolves `user_id` from the authenticated user's `uid`.
 */
export interface CreateChatSessionInput {
  metadata?: Record<string, unknown>;
}
