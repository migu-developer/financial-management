import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type {
  ChatMessageEventPayload,
  EventPublisherService,
} from '@services/chat/domain/services/event-publisher.service';

export interface SaveAssistantMessageInput {
  sessionId: string;
  uid: string;
  userEmail: string;
  content: string;
  expenseId?: string;
  /**
   * The USER message this reply answers.
   *
   * Used together with `expenseId` to retire that message's stored receipt
   * extraction once it has produced an expense. Optional so the branches that
   * do not create anything (query, clarification, unknown) need not supply it.
   */
  userMessageId?: string;
  /**
   * Keeps this reply out of the LLM transcript (it is still shown to the user).
   *
   * Set for the `error` and `unknown` branches: neither says anything about the
   * user's expense, and a history containing them has been observed pushing the
   * intent classifier to UNKNOWN on the following message.
   */
  hiddenFromContext?: boolean;
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
  eventType?: ChatMessageEventPayload['type'];
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
    /**
     * Notified when retiring the receipt extraction fails. Injected so the
     * handler can log/count it without this layer importing Powertools.
     */
    private readonly onLinkFailure?: (error: unknown) => void,
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
        ...(input.hiddenFromContext === true && { hidden_from_context: true }),
      },
      input.userEmail,
    );

    await this.sessionRepository.touchLastMessage(input.sessionId, input.uid);

    // Retire the receipt that produced this expense. Without it the extraction
    // stays "unused" forever: `expense_id` is written on THIS assistant message,
    // never on the user message that carried the image, so the guard in
    // `findLatestUnusedExtraction` could never become false and the receipt
    // would be merged into unrelated later messages of the same session.
    //
    // Best-effort: the expense already exists and the user has been told so, so
    // a failure here must not turn a successful registration into an error. The
    // cost of missing it is a stale replay, not lost money.
    if (input.expenseId !== undefined && input.userMessageId !== undefined) {
      try {
        await this.messageRepository.linkExpenseToMessage(
          input.userMessageId,
          input.uid,
          input.expenseId,
          input.userEmail,
        );
      } catch (error) {
        this.onLinkFailure?.(error);
      }
    }

    const payload: ChatMessageEventPayload = {
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
