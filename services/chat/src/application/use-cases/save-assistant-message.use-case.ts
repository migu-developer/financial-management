import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type {
  ChatEventPayload,
  EventPublisherService,
} from '@services/chat/domain/services/event-publisher.service';

export interface SaveAssistantMessageInput {
  sessionId: string;
  uid: string;
  userEmail: string;
  content: string;
  expenseId?: string;
  /**
   * If provided, the message is persisted as a HITL preview:
   *   - role stays 'assistant'
   *   - task_token + task_token_status='pending' are stored
   *   - the event is published as 'preview_pending' so the client renders
   *     the Confirm/Cancel buttons.
   */
  taskToken?: string;
  /**
   * Overrides the published event `type`. Defaults to `'preview_pending'` when
   * a `taskToken` is present, otherwise `'assistant_message'`. The workflow's
   * catch-all passes `'error'` so the client renders the failure gracefully.
   */
  eventType?: ChatEventPayload['type'];
}

export interface SaveAssistantMessageResult {
  message: ChatMessage;
}

/**
 * Persists an assistant message and publishes it to AppSync Events so the
 * client receives it in real time. Reused as the terminal step for every
 * branch of the chat workflow (QUERY answer, CREATE confirmation,
 * CREATE cancellation, CREATE clarification, CREATE preview).
 *
 * The single difference between a regular assistant message and a HITL
 * preview is whether `taskToken` is provided.
 */
export class SaveAssistantMessageUseCase {
  constructor(
    private readonly sessionRepository: ChatSessionRepository,
    private readonly messageRepository: ChatMessageRepository,
    private readonly publisher: EventPublisherService,
    private readonly channelTemplate: (userId: string) => string,
  ) {}

  async execute(
    input: SaveAssistantMessageInput,
  ): Promise<SaveAssistantMessageResult> {
    const isPreview = input.taskToken !== undefined;

    const message = await this.messageRepository.create(
      {
        session_id: input.sessionId,
        role: 'assistant',
        content: input.content,
        ...(input.expenseId !== undefined && { expense_id: input.expenseId }),
        ...(isPreview && {
          task_token: input.taskToken!,
          task_token_status: 'pending',
        }),
      },
      input.userEmail,
    );

    await this.sessionRepository.touchLastMessage(input.sessionId, input.uid);

    const payload: ChatEventPayload = {
      type:
        input.eventType ??
        (isPreview ? 'preview_pending' : 'assistant_message'),
      sessionId: input.sessionId,
      messageId: message.id,
      content: input.content,
      ...(input.expenseId !== undefined && { expenseId: input.expenseId }),
      ...(isPreview && { taskToken: input.taskToken! }),
    };

    await this.publisher.publish(this.channelTemplate(input.uid), payload);

    return { message };
  }
}
