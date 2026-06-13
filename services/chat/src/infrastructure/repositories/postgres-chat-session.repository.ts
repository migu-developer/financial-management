import type {
  ChatSession,
  CreateChatSessionInput,
} from '@services/chat/domain/entities/chat-session';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';
import { trace } from '@services/shared/infrastructure/decorators/trace';

const SESSION_COLUMNS = `
  s.id, s.user_id, s.started_at, s.last_message_at, s.metadata,
  s.created_at, s.updated_at, s.created_by, s.modified_by
`.trim();

const RETURNING_COLUMNS = `id, user_id, started_at, last_message_at, metadata,
                           created_at, updated_at, created_by, modified_by`;

const USER_ID_SUBQUERY = `(SELECT u.id FROM financial_management.users u WHERE u.uid = `;

export class PostgresChatSessionRepository implements ChatSessionRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('ChatSession:findByIdAndUserUid')
  async findByIdAndUserUid(
    id: string,
    uid: string,
  ): Promise<ChatSession | null> {
    const rows = await this.dbService.queryReadOnly<ChatSession>(
      `SELECT ${SESSION_COLUMNS}
       FROM financial_management.chat_sessions s
       JOIN financial_management.users u ON s.user_id = u.id
       WHERE s.id = $1 AND u.uid = $2
       LIMIT 1`,
      [id, uid],
    );
    return rows[0] ?? null;
  }

  @trace('ChatSession:create')
  async create(
    input: CreateChatSessionInput,
    uid: string,
    createdBy: string,
  ): Promise<ChatSession> {
    const rows = await this.dbService.query<ChatSession>(
      `INSERT INTO financial_management.chat_sessions
         (user_id, metadata, created_by, modified_by)
       SELECT u.id, COALESCE($1::jsonb, '{}'::jsonb), $2, $2
       FROM financial_management.users u
       WHERE u.uid = $3
       RETURNING ${RETURNING_COLUMNS}`,
      [input.metadata ? JSON.stringify(input.metadata) : null, createdBy, uid],
    );
    if (!rows[0])
      throw new DataNotDefinedError('Failed to create chat session');
    return rows[0];
  }

  @trace('ChatSession:touchLastMessage')
  async touchLastMessage(id: string, uid: string): Promise<void> {
    await this.dbService.query(
      `UPDATE financial_management.chat_sessions
       SET last_message_at = now()
       WHERE id = $1 AND user_id = ${USER_ID_SUBQUERY}$2)`,
      [id, uid],
    );
  }
}
