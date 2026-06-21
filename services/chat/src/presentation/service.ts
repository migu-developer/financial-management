import { Service } from '@services/chat/types/service';
import type { Application } from '@services/chat/presentation/application';
import { SendMessageUseCase } from '@services/chat/application/use-cases/send-message.use-case';
import { ConfirmPendingExpenseUseCase } from '@services/chat/application/use-cases/confirm-pending-expense.use-case';
import { ListSessionsUseCase } from '@services/chat/application/use-cases/list-sessions.use-case';
import { GetSessionMessagesUseCase } from '@services/chat/application/use-cases/get-session-messages.use-case';
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

    // A well-formed send-message request was accepted for processing.
    this.app.metrics.count('ChatMessageReceived');

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
      this.app.workflowCallback,
    );

    let result: Awaited<ReturnType<SendMessageUseCase['execute']>>;
    try {
      result = await useCase.execute(
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
    } catch (error) {
      // Persisting the message or kicking off the Step Function failed — the
      // client never gets its async answer, so alarm on it separately.
      this.app.metrics.count('ChatWorkflowStartFailure');
      throw error;
    }

    // Each silently-released pending preview (user iterated on a confirmation)
    // is tracked so we can see how often previews get abandoned.
    if (result.supersededPreviews > 0) {
      this.app.metrics.count(
        'ChatPreviewSuperseded',
        result.supersededPreviews,
      );
    }

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
      // 202 Accepted: the message was accepted for async processing; the real
      // answer arrives later over the AppSync Events WebSocket.
      { status: HttpCode.ACCEPTED },
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

/**
 * Service for `GET /chat/sessions`.
 *
 * Lists the authenticated user's chat sessions (newest activity first)
 * so the client can render the sessions sidebar and switch between them.
 */
export class ChatSessionsService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing chat sessions GET request',
      ChatSessionsService.name,
    );

    const sessionRepository = new PostgresChatSessionRepository(
      this.app.dbService,
    );
    const useCase = new ListSessionsUseCase(sessionRepository);

    const sessions = await useCase.execute(this.app.user.uid);

    return new Response(JSON.stringify({ success: true, data: { sessions } }), {
      status: HttpCode.SUCCESS,
    });
  }
}

/**
 * Service for `GET /chat/sessions/{id}/messages`.
 *
 * Returns a session's messages (oldest → newest) so the client can
 * restore the conversation on reload or when switching sessions.
 */
export class ChatSessionMessagesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing chat session messages GET request',
      ChatSessionMessagesService.name,
    );

    const sessionId = this.app.event.pathParameters?.['id'];
    if (!sessionId) {
      throw new DataNotDefinedError('session id is required');
    }

    const sessionRepository = new PostgresChatSessionRepository(
      this.app.dbService,
    );
    const messageRepository = new PostgresChatMessageRepository(
      this.app.dbService,
    );
    const useCase = new GetSessionMessagesUseCase(
      sessionRepository,
      messageRepository,
    );

    const messages = await useCase.execute(sessionId, this.app.user.uid);

    return new Response(
      JSON.stringify({ success: true, data: { sessionId, messages } }),
      { status: HttpCode.SUCCESS },
    );
  }
}
