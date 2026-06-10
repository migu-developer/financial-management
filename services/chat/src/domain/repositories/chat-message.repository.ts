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
   * Finds the assistant message that is currently holding a `pending`
   * task token. Used by the human-in-the-loop confirmation flow to look
   * up the workflow waiting on the user.
   */
  findPendingByTaskToken(
    taskToken: string,
    uid: string,
  ): Promise<ChatMessage | null>;

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
