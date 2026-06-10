import type {
  ChatMessage,
  ChatMessageAttachmentType,
} from '@services/chat/domain/entities/chat-message';
import type { ChatSession } from '@services/chat/domain/entities/chat-session';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type {
  StartChatWorkflowResult,
  WorkflowStarterService,
} from '@services/chat/domain/services/workflow-starter.service';
import { UnauthorizedError } from '@packages/models/shared/utils/errors';

export interface SendMessageInput {
  sessionId?: string;
  content: string;
  attachmentS3Key?: string;
  attachmentType?: ChatMessageAttachmentType;
}

export interface SendMessageResult {
  session: ChatSession;
  userMessage: ChatMessage;
  execution: StartChatWorkflowResult;
}

/**
 * Persists the user's message and starts the async chat workflow.
 *
 * Flow:
 *   1. Resolve session: use the provided `sessionId` or create a new one.
 *   2. Persist the user's message inside that session (role = 'user').
 *   3. Bump `last_message_at` on the session.
 *   4. Start the Step Function execution with the message context.
 *   5. Return immediately so the caller can ACK the client in ~100ms.
 *
 * The Step Function runs in the background and ultimately publishes the
 * response over AppSync Events; no waiting happens here.
 */
export class SendMessageUseCase {
  constructor(
    private readonly sessionRepository: ChatSessionRepository,
    private readonly messageRepository: ChatMessageRepository,
    private readonly workflowStarter: WorkflowStarterService,
  ) {}

  async execute(
    input: SendMessageInput,
    uid: string,
    userEmail: string,
  ): Promise<SendMessageResult> {
    const session = await this.resolveSession(input.sessionId, uid, userEmail);

    const userMessage = await this.messageRepository.create(
      {
        session_id: session.id,
        role: 'user',
        content: input.content,
        attachment_s3_key: input.attachmentS3Key ?? null,
        attachment_type: input.attachmentType ?? null,
      },
      userEmail,
    );

    await this.sessionRepository.touchLastMessage(session.id, uid);

    const execution = await this.workflowStarter.start({
      messageId: userMessage.id,
      sessionId: session.id,
      userId: uid,
      userEmail,
      content: input.content,
      ...(input.attachmentS3Key !== undefined && {
        attachmentS3Key: input.attachmentS3Key,
      }),
      ...(input.attachmentType !== undefined && {
        attachmentType: input.attachmentType,
      }),
    });

    return { session, userMessage, execution };
  }

  private async resolveSession(
    sessionId: string | undefined,
    uid: string,
    userEmail: string,
  ): Promise<ChatSession> {
    if (sessionId) {
      const existing = await this.sessionRepository.findByIdAndUserUid(
        sessionId,
        uid,
      );
      if (!existing) {
        throw new UnauthorizedError();
      }
      return existing;
    }
    return this.sessionRepository.create({}, uid, userEmail);
  }
}
