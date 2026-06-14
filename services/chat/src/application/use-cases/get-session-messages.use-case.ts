import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import { UnauthorizedError } from '@packages/models/shared/utils/errors';

/** How many recent messages to return when restoring a session. */
const RESTORE_LIMIT = 200;

/**
 * Returns the messages of a session (oldest → newest) so the client can
 * restore the conversation on reload or when switching sessions.
 *
 * Ownership is verified first: a session that doesn't belong to the user
 * throws `UnauthorizedError` instead of leaking an empty conversation.
 */
export class GetSessionMessagesUseCase {
  constructor(
    private readonly sessionRepository: ChatSessionRepository,
    private readonly messageRepository: ChatMessageRepository,
  ) {}

  async execute(sessionId: string, uid: string): Promise<ChatMessage[]> {
    const session = await this.sessionRepository.findByIdAndUserUid(
      sessionId,
      uid,
    );
    if (!session) {
      throw new UnauthorizedError();
    }

    return this.messageRepository.findRecentBySession(
      sessionId,
      uid,
      RESTORE_LIMIT,
    );
  }
}
