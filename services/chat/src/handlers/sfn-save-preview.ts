import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import { AppSyncEventPublisher } from '@services/chat/infrastructure/services/appsync-event-publisher.service';
import { SaveAssistantMessageUseCase } from '@services/chat/application/use-cases/save-assistant-message.use-case';

import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('chat-save-preview');
const metricsService = new MetricsServiceImplementation('chat');
const publisher = new AppSyncEventPublisher(
  requireEnv(process.env['APPSYNC_HTTP_DNS'], 'APPSYNC_HTTP_DNS'),
  requireEnv(process.env['AWS_REGION'], 'AWS_REGION'),
);
const namespace = requireEnv(
  process.env['APPSYNC_CHAT_NAMESPACE'],
  'APPSYNC_CHAT_NAMESPACE',
);
const channelTemplate = (uid: string) => `${namespace}/${uid}/responses`;

export interface SavePreviewEvent {
  sessionId: string;
  uid: string;
  userEmail: string;
  content: string;
  /**
   * Provided by Step Functions when the task uses the `.waitForTaskToken`
   * integration pattern. We persist it on the chat message so the
   * `POST /chat/confirm` callback can find it later and resume the SF.
   */
  taskToken: string;
}

/**
 * `.waitForTaskToken` Step Functions task: stores the preview message + token
 * and tells the client to render Confirm/Cancel. The state machine stays
 * paused on this task token until `POST /chat/confirm` calls
 * `SendTaskSuccess`.
 */
export const handler = async (event: SavePreviewEvent) => {
  const logger = new LoggerServiceImplementation('chat-save-preview');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('userId', event.uid);

  logger.info('Saving expense preview with task token (HITL)', {
    sessionId: event.sessionId,
    uid: event.uid,
  });

  const sessionRepository = new PostgresChatSessionRepository(dbService);
  const messageRepository = new PostgresChatMessageRepository(dbService);

  const useCase = new SaveAssistantMessageUseCase(
    sessionRepository,
    messageRepository,
    publisher,
    channelTemplate,
  );

  try {
    const result = await useCase.execute({
      sessionId: event.sessionId,
      uid: event.uid,
      userEmail: event.userEmail,
      content: event.content,
      taskToken: event.taskToken,
    });

    logger.info('Preview saved; Step Function will wait for confirmation', {
      messageId: result.message.id,
    });
    metricsService.count('ChatPreviewRequested');

    return { messageId: result.message.id };
  } finally {
    metricsService.publish();
  }
};
