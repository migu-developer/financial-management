import type {
  ChatAttachmentExtraction,
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
   * Stores what was read from a message's attachment.
   *
   * Separate from `create` because the extraction is produced LATER, by the
   * workflow, after the user message is already persisted. Written as soon as
   * the read succeeds rather than at the end of the run, so a failure further
   * down the workflow does not force the attachment to be analyzed again.
   *
   * Scoped to the owning user, like every other write here.
   */
  saveAttachmentExtraction(
    id: string,
    uid: string,
    extraction: ChatAttachmentExtraction,
    modifiedBy: string,
  ): Promise<void>;

  /**
   * Links a USER message to the expense it produced, which retires its stored
   * extraction from `findLatestUnusedExtraction`.
   *
   * Needed because `expense_id` was only ever written on the ASSISTANT
   * confirmation, never on the message that carried the receipt — so the
   * "already used" guard below could never become false and a finished receipt
   * would be replayed into unrelated later messages of the same session.
   */
  linkExpenseToMessage(
    id: string,
    uid: string,
    expenseId: string,
    modifiedBy: string,
  ): Promise<void>;

  /**
   * Returns the most recent attachment extraction in a session that has NOT yet
   * produced an expense, or null when there is none.
   *
   * This is what makes a follow-up turn work: when the user answers "COP" to a
   * question about a receipt, the answer alone carries no amount or merchant, so
   * the workflow needs the fields already read from the image. Excluding
   * extractions whose message already led to an expense stops a finished receipt
   * from leaking into an unrelated later message.
   */
  findLatestUnusedExtraction(
    sessionId: string,
    uid: string,
  ): Promise<ChatAttachmentExtraction | null>;

  /**
   * Same as `findRecentBySession`, but skips replies flagged
   * `hidden_from_context`.
   *
   * A SEPARATE method rather than a flag on the other one because the two have
   * opposite goals: `findRecentBySession` restores what the USER saw and must
   * include every message; this builds the transcript the LLM reasons over,
   * where an "Uy, tuve un problema" or a "no puedo procesar imágenes" is pure
   * noise that has already been observed derailing intent classification.
   */
  findRecentForContext(
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

  /**
   * Forces a message to `expired`, regardless of its current status.
   * Used to reconcile a row when the confirmation callback discovers the
   * task token is already gone (the HITL wait timed out). Unlike
   * `updateTaskTokenStatus`, this has no `pending` guard because the caller
   * already owns the row (it won the pending→decision transition).
   */
  markExpired(id: string, uid: string, modifiedBy: string): Promise<void>;
}
