import type {
  ChatMessage,
  ChatMessageTaskTokenStatus,
  CreateChatMessageInput,
} from '@services/chat/domain/entities/chat-message';

/**
 * Port for chat message persistence. Implementations live in
 * `src/infrastructure/repositories/`.
 */
export interface ChatMessageRepository {
  /**
   * Persists a new chat message. The caller has already validated that the
   * session belongs to the user.
   */
  create(
    input: CreateChatMessageInput,
    createdBy: string,
  ): Promise<ChatMessage>;

  /**
   * Returns the most recent messages of a session (oldest → newest) so the
   * workflow can give the LLM conversation context for multi-turn flows
   * (e.g. answering a clarification). Scoped to the owning user.
   */
  findRecentBySession(
    sessionId: string,
    uid: string,
    limit: number,
  ): Promise<ChatMessage[]>;

  /**
   * Finds the assistant message that is currently holding a `pending`
   * task token. Used by the human-in-the-loop confirmation flow to look
   * up the workflow waiting on the user.
   */
  findPendingByTaskToken(
    taskToken: string,
    uid: string,
  ): Promise<ChatMessage | null>;

  /**
   * Returns the session's assistant preview messages that are still
   * `pending` (have a `task_token`). Used when the user iterates on a
   * preview: each one is superseded so only the latest confirmation
   * remains actionable. Scoped to the owning user.
   */
  findPendingPreviewsBySession(
    sessionId: string,
    uid: string,
  ): Promise<ChatMessage[]>;

  /**
   * Updates the `task_token_status` of a message. Called after the user
   * confirms or cancels (or after timeout reconciliation).
   */
  updateTaskTokenStatus(
    id: string,
    uid: string,
    status: ChatMessageTaskTokenStatus,
    modifiedBy: string,
  ): Promise<ChatMessage>;
}
