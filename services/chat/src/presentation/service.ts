import { Service } from '@services/chat/types/service';
import type { Application } from '@services/chat/presentation/application';
import { SendMessageUseCase } from '@services/chat/application/use-cases/send-message.use-case';
import { ConfirmPendingExpenseUseCase } from '@services/chat/application/use-cases/confirm-pending-expense.use-case';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

interface SendMessageRequestBody {
  sessionId?: string;
  content: string;
  attachmentS3Key?: string;
  attachmentType?: 'image' | 'audio';
}

interface ConfirmRequestBody {
  taskToken: string;
  confirmed: boolean;
}

/**
 * Service for `POST /chat`.
 *
 * Persists the user message synchronously and starts the async chat
 * workflow. Returns a 202 ACK with `status: "processing"` so the client
 * can render the typing indicator while the Step Function runs.
 */
export class ChatService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executePOST(): Promise<Response> {
    this.app.logger.info('Executing chat POST request', ChatService.name);

    if (!this.app.event.body) {
      throw new DataNotDefinedError('Request body is required');
    }

    const body = JSON.parse(this.app.event.body) as SendMessageRequestBody;

    if (!body.content || typeof body.content !== 'string') {
      throw new DataNotDefinedError('content is required');
    }

    const sessionRepository = new PostgresChatSessionRepository(
      this.app.dbService,
    );
    const messageRepository = new PostgresChatMessageRepository(
      this.app.dbService,
    );
    const useCase = new SendMessageUseCase(
      sessionRepository,
      messageRepository,
      this.app.workflowStarter,
    );

    const result = await useCase.execute(
      {
        ...(body.sessionId !== undefined && { sessionId: body.sessionId }),
        content: body.content,
        ...(body.attachmentS3Key !== undefined && {
          attachmentS3Key: body.attachmentS3Key,
        }),
        ...(body.attachmentType !== undefined && {
          attachmentType: body.attachmentType,
        }),
      },
      this.app.user.uid,
      this.app.user.email,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: 'processing',
          sessionId: result.session.id,
          messageId: result.userMessage.id,
          executionArn: result.execution.executionArn,
        },
      }),
      { status: HttpCode.SUCCESS },
    );
  }
}

/**
 * Service for `POST /chat/confirm`.
 *
 * Resumes a paused Step Function with the user's decision on a pending
 * expense preview (Human-in-the-Loop).
 */
export class ChatConfirmService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executePOST(): Promise<Response> {
    this.app.logger.info(
      'Executing chat confirm POST request',
      ChatConfirmService.name,
    );

    if (!this.app.event.body) {
      throw new DataNotDefinedError('Request body is required');
    }

    const body = JSON.parse(this.app.event.body) as ConfirmRequestBody;

    if (!body.taskToken || typeof body.taskToken !== 'string') {
      throw new DataNotDefinedError('taskToken is required');
    }
    if (typeof body.confirmed !== 'boolean') {
      throw new DataNotDefinedError('confirmed (boolean) is required');
    }

    const messageRepository = new PostgresChatMessageRepository(
      this.app.dbService,
    );
    const useCase = new ConfirmPendingExpenseUseCase(
      messageRepository,
      this.app.workflowCallback,
    );

    const result = await useCase.execute(
      { taskToken: body.taskToken, confirmed: body.confirmed },
      this.app.user.uid,
      this.app.user.email,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: result.message.task_token_status,
          messageId: result.message.id,
        },
      }),
      { status: HttpCode.SUCCESS },
    );
  }
}
