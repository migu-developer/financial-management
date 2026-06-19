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
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';
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
  /**
   * How many still-pending expense previews were silently released because the
   * user sent a new message. Surfaced so the handler can emit the
   * `ChatPreviewSuperseded` metric without pulling Powertools into the domain.
   */
  supersededPreviews: number;
}

/** How many prior messages to feed the LLM as conversation context. */
const HISTORY_LIMIT = 10;
/** Cap each message in the history to keep the workflow input small. */
const HISTORY_CONTENT_MAX = 500;

const ROLE_LABEL: Record<string, string> = {
  user: 'Usuario',
  assistant: 'Asistente',
  system: 'Sistema',
};

/**
 * Formats recent messages (oldest → newest) into a compact transcript the
 * intent/extraction prompts can reason over. Returns '' when there's none.
 */
export function formatHistory(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const label = ROLE_LABEL[m.role] ?? m.role;
      // Collapse newlines/whitespace so a multi-line message can't break the
      // line-based "Role: ..." transcript structure the LLM reads.
      const content = m.content
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, HISTORY_CONTENT_MAX);
      return `${label}: ${content}`;
    })
    .join('\n');
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
    private readonly workflowCallback: WorkflowCallbackService,
  ) {}

  async execute(
    input: SendMessageInput,
    uid: string,
    userEmail: string,
  ): Promise<SendMessageResult> {
    const session = await this.resolveSession(input.sessionId, uid, userEmail);

    // Sending a new message in a session that still has a pending expense
    // preview means the user is iterating on it. Release the old preview(s)
    // silently so only the latest confirmation stays actionable and the
    // abandoned executions don't fire a false timeout alarm.
    const supersededPreviews = await this.supersedePendingPreviews(
      session.id,
      uid,
      userEmail,
    );

    // Load prior turns BEFORE persisting the current message so the history
    // is context for it (not including it).
    const priorMessages = await this.messageRepository.findRecentBySession(
      session.id,
      uid,
      HISTORY_LIMIT,
    );
    const history = formatHistory(priorMessages);

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
      history,
      ...(input.attachmentS3Key !== undefined && {
        attachmentS3Key: input.attachmentS3Key,
      }),
      ...(input.attachmentType !== undefined && {
        attachmentType: input.attachmentType,
      }),
    });

    return { session, userMessage, execution, supersededPreviews };
  }

  /**
   * Marks any still-pending preview in the session as `superseded` and
   * resumes its paused workflow with `{ confirmed: false, superseded: true }`
   * so the Choice state ends silently (no expense, no client publish).
   *
   * Returns the number of previews actually released so the caller can emit a
   * metric. Best-effort per preview: the DB guard makes the status transition
   * atomic (only `pending` rows flip), and a failed callback for one stale
   * token must not block the user's new message — the worst case is the old
   * execution eventually timing out, which is what we already had.
   */
  private async supersedePendingPreviews(
    sessionId: string,
    uid: string,
    userEmail: string,
  ): Promise<number> {
    const pending = await this.messageRepository.findPendingPreviewsBySession(
      sessionId,
      uid,
    );

    let superseded = 0;
    for (const preview of pending) {
      if (!preview.task_token) continue;
      try {
        await this.messageRepository.updateTaskTokenStatus(
          preview.id,
          uid,
          'superseded',
          userEmail,
        );
        await this.workflowCallback.resume(preview.task_token, {
          confirmed: false,
          superseded: true,
        });
        superseded += 1;
      } catch {
        // A concurrent confirm/cancel may have already resolved this token,
        // or the execution may be gone. Skip and continue — the new message
        // must still go through.
      }
    }
    return superseded;
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
