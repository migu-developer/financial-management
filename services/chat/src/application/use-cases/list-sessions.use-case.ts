import type { ChatSessionSummary } from '@services/chat/domain/entities/chat-session';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';

/** Cap the sidebar to a sane number of recent sessions. */
const DEFAULT_LIMIT = 50;

/**
 * Lists the authenticated user's chat sessions for the sidebar
 * (newest activity first), so the client can switch between them.
 */
export class ListSessionsUseCase {
  constructor(private readonly sessionRepository: ChatSessionRepository) {}

  async execute(
    uid: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<ChatSessionSummary[]> {
    return this.sessionRepository.findByUser(uid, limit);
  }
}
