import type {
  ChatAttachmentExtraction,
  ChatMessage,
  ChatMessageTaskTokenStatus,
  CreateChatMessageInput,
} from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';
import { trace } from '@services/shared/infrastructure/decorators/trace';

const MESSAGE_COLUMNS = `
  m.id, m.session_id, m.role, m.content, m.attachment_s3_key, m.attachment_type,
  m.attachment_extraction, m.expense_id, m.task_token, m.task_token_status,
  m.hidden_from_context,
  m.created_at, m.updated_at, m.created_by, m.modified_by
`.trim();

const RETURNING_COLUMNS = `id, session_id, role, content, attachment_s3_key, attachment_type,
                           attachment_extraction, expense_id, task_token, task_token_status,
                           hidden_from_context,
                           created_at, updated_at, created_by, modified_by`;

export class PostgresChatMessageRepository implements ChatMessageRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('ChatMessage:findRecentBySession')
  async findRecentBySession(
    sessionId: string,
    uid: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    // Newest-first in SQL (so LIMIT keeps the latest), then reversed to
    // chronological order for the LLM. Scoped to the owning user.
    const rows = await this.dbService.queryReadOnly<ChatMessage>(
      `SELECT ${MESSAGE_COLUMNS}
       FROM financial_management.chat_messages m
       JOIN financial_management.chat_sessions s ON m.session_id = s.id
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE m.session_id = $1 AND u.uid = $2
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $3`,
      [sessionId, uid, limit],
    );
    return rows.reverse();
  }

  @trace('ChatMessage:findRecentForContext')
  async findRecentForContext(
    sessionId: string,
    uid: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    // Identical to findRecentBySession apart from the flag. Kept as its own
    // query rather than a parameter so the UI path can never accidentally start
    // hiding messages the user actually saw.
    const rows = await this.dbService.queryReadOnly<ChatMessage>(
      `SELECT ${MESSAGE_COLUMNS}
       FROM financial_management.chat_messages m
       JOIN financial_management.chat_sessions s ON m.session_id = s.id
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE m.session_id = $1 AND u.uid = $2
         AND m.hidden_from_context = false
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $3`,
      [sessionId, uid, limit],
    );
    return rows.reverse();
  }

  @trace('ChatMessage:create')
  async create(
    input: CreateChatMessageInput,
    createdBy: string,
  ): Promise<ChatMessage> {
    const rows = await this.dbService.query<ChatMessage>(
      `INSERT INTO financial_management.chat_messages
         (session_id, role, content, attachment_s3_key, attachment_type,
          expense_id, task_token, task_token_status, hidden_from_context,
          created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING ${RETURNING_COLUMNS}`,
      [
        input.session_id,
        input.role,
        input.content,
        input.attachment_s3_key ?? null,
        input.attachment_type ?? null,
        input.expense_id ?? null,
        input.task_token ?? null,
        input.task_token_status ?? null,
        input.hidden_from_context ?? false,
        createdBy,
      ],
    );
    if (!rows[0])
      throw new DataNotDefinedError('Failed to create chat message');
    return rows[0];
  }

  @trace('ChatMessage:findPendingByTaskToken')
  async findPendingByTaskToken(
    taskToken: string,
    uid: string,
  ): Promise<ChatMessage | null> {
    const rows = await this.dbService.queryReadOnly<ChatMessage>(
      `SELECT ${MESSAGE_COLUMNS}
       FROM financial_management.chat_messages m
       JOIN financial_management.chat_sessions s ON m.session_id = s.id
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE m.task_token = $1
         AND m.task_token_status = 'pending'
         AND u.uid = $2
       LIMIT 1`,
      [taskToken, uid],
    );
    return rows[0] ?? null;
  }

  @trace('ChatMessage:findPendingPreviewsBySession')
  async findPendingPreviewsBySession(
    sessionId: string,
    uid: string,
  ): Promise<ChatMessage[]> {
    const rows = await this.dbService.queryReadOnly<ChatMessage>(
      `SELECT ${MESSAGE_COLUMNS}
       FROM financial_management.chat_messages m
       JOIN financial_management.chat_sessions s ON m.session_id = s.id
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE m.session_id = $1
         AND u.uid = $2
         AND m.task_token IS NOT NULL
         AND m.task_token_status = 'pending'
       ORDER BY m.created_at ASC, m.id ASC`,
      [sessionId, uid],
    );
    return rows;
  }

  @trace('ChatMessage:updateTaskTokenStatus')
  async updateTaskTokenStatus(
    id: string,
    uid: string,
    status: ChatMessageTaskTokenStatus,
    modifiedBy: string,
  ): Promise<ChatMessage> {
    // The `task_token_status = 'pending'` guard makes the transition atomic:
    // two concurrent /chat/confirm calls can both pass findPendingByTaskToken,
    // but only the first UPDATE matches a pending row. The loser gets 0 rows
    // (throws below) and never reaches SendTaskSuccess — no double-resume.
    const rows = await this.dbService.query<ChatMessage>(
      `UPDATE financial_management.chat_messages m
       SET task_token_status = $3, modified_by = $4
       FROM financial_management.chat_sessions s,
            financial_management.users u
       WHERE m.id = $1
         AND m.session_id = s.id
         AND s.user_id = u.id
         AND u.uid = $2
         AND m.task_token_status = 'pending'
       RETURNING ${RETURNING_COLUMNS.split(',')
         .map((c) => `m.${c.trim()}`)
         .join(', ')}`,
      [id, uid, status, modifiedBy],
    );
    if (!rows[0]) {
      throw new DataNotDefinedError(
        'Failed to update chat message task token status',
      );
    }
    return rows[0];
  }

  @trace('ChatMessage:saveAttachmentExtraction')
  async saveAttachmentExtraction(
    id: string,
    uid: string,
    extraction: ChatAttachmentExtraction,
    modifiedBy: string,
  ): Promise<void> {
    // `attachment_s3_key IS NOT NULL` mirrors the table CHECK. Without it a
    // wrong messageId would raise a constraint violation the caller would have
    // to interpret; with it the UPDATE simply matches no row, and the workflow
    // carries on (the extraction is a cache, not the user's expense).
    await this.dbService.query(
      `UPDATE financial_management.chat_messages m
       SET attachment_extraction = $3::jsonb, modified_by = $4
       FROM financial_management.chat_sessions s,
            financial_management.users u
       WHERE m.id = $1
         AND m.session_id = s.id
         AND s.user_id = u.id
         AND u.uid = $2
         AND m.attachment_s3_key IS NOT NULL`,
      [id, uid, JSON.stringify(extraction), modifiedBy],
    );
  }

  @trace('ChatMessage:linkExpenseToMessage')
  async linkExpenseToMessage(
    id: string,
    uid: string,
    expenseId: string,
    modifiedBy: string,
  ): Promise<void> {
    // No status guard: this only records which expense the message produced.
    await this.dbService.query(
      `UPDATE financial_management.chat_messages m
       SET expense_id = $3, modified_by = $4
       FROM financial_management.chat_sessions s,
            financial_management.users u
       WHERE m.id = $1
         AND m.session_id = s.id
         AND s.user_id = u.id
         AND u.uid = $2`,
      [id, uid, expenseId, modifiedBy],
    );
  }

  @trace('ChatMessage:findLatestUnusedExtraction')
  async findLatestUnusedExtraction(
    sessionId: string,
    uid: string,
  ): Promise<ChatAttachmentExtraction | null> {
    // Takes the NEWEST extraction in the session and returns it only when it is
    // still unused — deliberately NOT "the newest unused one".
    //
    // That earlier form had a hole, proven against the real database: send photo
    // A (abandoned), then photo B, then complete B. Retiring B made A the newest
    // *unused* extraction again, so it resurfaced and would have been replayed
    // into a later unrelated message — the very failure this feature removes,
    // through a different door.
    //
    // Looking at the newest row regardless of `expense_id` fixes it in one step:
    // a newer photo naturally supersedes an older one, and once that newest photo
    // has produced an expense the lookup returns nothing.
    //
    // PRIMARY, not the read replica. This is a read-your-writes dependency: the
    // extraction was written seconds earlier by the previous turn's workflow,
    // and a lagging replica would return nothing — silently restoring the exact
    // dead end this whole feature removes.
    //
    // A read-through fallback (replica, then primary on a miss) was considered
    // and rejected: a miss is the COMMON case (most messages have no receipt in
    // flight), so it would double the query count for ordinary traffic to
    // protect the rare one. This is a single indexed row lookup.
    const rows = await this.dbService.query<{
      attachment_extraction: ChatAttachmentExtraction;
      expense_id: string | null;
    }>(
      `SELECT m.attachment_extraction, m.expense_id
       FROM financial_management.chat_messages m
       JOIN financial_management.chat_sessions s ON m.session_id = s.id
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE m.session_id = $1
         AND u.uid = $2
         AND m.attachment_extraction IS NOT NULL
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1`,
      [sessionId, uid],
    );

    const newest = rows[0];
    if (!newest || newest.expense_id !== null) return null;
    return newest.attachment_extraction;
  }

  @trace('ChatMessage:markExpired')
  async markExpired(
    id: string,
    uid: string,
    modifiedBy: string,
  ): Promise<void> {
    // No status guard: the caller already claimed this row and only needs to
    // reconcile it to 'expired' after the task token turned out to be gone.
    await this.dbService.query(
      `UPDATE financial_management.chat_messages m
       SET task_token_status = 'expired', modified_by = $3
       FROM financial_management.chat_sessions s,
            financial_management.users u
       WHERE m.id = $1
         AND m.session_id = s.id
         AND s.user_id = u.id
         AND u.uid = $2`,
      [id, uid, modifiedBy],
    );
  }
}
