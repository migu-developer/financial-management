import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';
import {
  DataNotDefinedError,
  ModuleError,
  UnauthorizedError,
} from '@packages/models/shared/utils/errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Step Functions errors that mean the task token is no longer actionable:
 * the HITL wait already timed out (and was caught) or the token was consumed.
 */
const GONE_TOKEN_ERRORS = new Set([
  'TaskTimedOut',
  'TaskDoesNotExist',
  'InvalidToken',
]);

function isGoneTokenError(error: unknown): boolean {
  return error instanceof Error && GONE_TOKEN_ERRORS.has(error.name);
}

/**
 * Raised when the user confirms/cancels a preview whose wait window already
 * elapsed. Mapped to a 400 so the client can show "this preview expired"
 * instead of a generic 500.
 */
export class PreviewExpiredError extends ModuleError {
  constructor(cause?: unknown) {
    super(
      { message: 'This expense preview has expired', cause },
      HttpCode.BAD_REQUEST,
    );
  }

  getMessage(): string {
    return this.params['message'] as string;
  }

  getCode(): number {
    return this.code;
  }
}

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

    // Claim the row first (pending → decision). The `pending` guard makes this
    // the atomic lock against a double-resume; the winner owns the row.
    const updated = await this.messageRepository.updateTaskTokenStatus(
      message.id,
      uid,
      nextStatus,
      userEmail,
    );

    try {
      await this.workflowCallback.resume(input.taskToken, {
        confirmed: input.confirmed,
      });
    } catch (error) {
      if (isGoneTokenError(error)) {
        // The HITL wait already timed out (token gone): no expense will be
        // created. Reconcile the row to 'expired' and surface a clean error
        // instead of the raw SFN failure.
        await this.messageRepository.markExpired(message.id, uid, userEmail);
        throw new PreviewExpiredError(error);
      }
      throw error;
    }

    return { message: updated };
  }
}
