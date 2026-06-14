import type {
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
  m.expense_id, m.task_token, m.task_token_status,
  m.created_at, m.updated_at, m.created_by, m.modified_by
`.trim();

const RETURNING_COLUMNS = `id, session_id, role, content, attachment_s3_key, attachment_type,
                           expense_id, task_token, task_token_status,
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

  @trace('ChatMessage:create')
  async create(
    input: CreateChatMessageInput,
    createdBy: string,
  ): Promise<ChatMessage> {
    const rows = await this.dbService.query<ChatMessage>(
      `INSERT INTO financial_management.chat_messages
         (session_id, role, content, attachment_s3_key, attachment_type,
          expense_id, task_token, task_token_status, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
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
}
