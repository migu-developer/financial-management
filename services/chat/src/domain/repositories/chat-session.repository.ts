import type {
  ChatSession,
  CreateChatSessionInput,
} from '@services/chat/domain/entities/chat-session';

/**
 * Port for chat session persistence. Implementations live in
 * `src/infrastructure/repositories/`.
 *
 * All methods scope by the authenticated user's `uid` so the layer
 * mirrors the row-level security policies in PostgreSQL.
 */
export interface ChatSessionRepository {
  /**
   * Returns the session with the given id, only if it belongs to the user.
   * Returns `null` when the session does not exist or is owned by someone else.
   */
  findByIdAndUserUid(id: string, uid: string): Promise<ChatSession | null>;

  /**
   * Creates a new session for the user identified by `uid`.
   * `createdBy` is stored in the audit columns (usually the user's email).
   */
  create(
    input: CreateChatSessionInput,
    uid: string,
    createdBy: string,
  ): Promise<ChatSession>;

  /**
   * Refreshes the session's `last_message_at` timestamp.
   * Used after a new message is persisted to keep history lists sorted.
   */
  touchLastMessage(id: string, uid: string): Promise<void>;
}
