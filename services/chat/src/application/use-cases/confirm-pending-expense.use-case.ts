import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';
import {
  DataNotDefinedError,
  UnauthorizedError,
} from '@packages/models/shared/utils/errors';

export interface ConfirmPendingExpenseInput {
  taskToken: string;
  confirmed: boolean;
}

export interface ConfirmPendingExpenseResult {
  message: ChatMessage;
}

/**
 * Resumes a paused Step Function with the user's decision on a pending
 * expense preview (Human-in-the-Loop).
 *
 * Flow:
 *   1. Find the assistant message currently holding this task token.
 *      It must be `pending` AND owned by the requesting user.
 *   2. Update its `task_token_status` to `confirmed` or `cancelled`.
 *      Doing this BEFORE the callback prevents double-resume races.
 *   3. Call `SendTaskSuccess(taskToken, { confirmed })` so the
 *      ChatProcess workflow continues with the user's choice.
 */
export class ConfirmPendingExpenseUseCase {
  constructor(
    private readonly messageRepository: ChatMessageRepository,
    private readonly workflowCallback: WorkflowCallbackService,
  ) {}

  async execute(
    input: ConfirmPendingExpenseInput,
    uid: string,
    userEmail: string,
  ): Promise<ConfirmPendingExpenseResult> {
    if (!input.taskToken) {
      throw new DataNotDefinedError('taskToken is required');
    }

    const message = await this.messageRepository.findPendingByTaskToken(
      input.taskToken,
      uid,
    );

    if (!message) {
      // The token either doesn't exist, was already resolved, or belongs to
      // another user. Treat all cases as Unauthorized to avoid leaking info.
      throw new UnauthorizedError();
    }

    const nextStatus = input.confirmed ? 'confirmed' : 'cancelled';

    const updated = await this.messageRepository.updateTaskTokenStatus(
      message.id,
      uid,
      nextStatus,
      userEmail,
    );

    await this.workflowCallback.resume(input.taskToken, {
      confirmed: input.confirmed,
    });

    return { message: updated };
  }
}
