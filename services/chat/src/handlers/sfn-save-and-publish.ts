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
const tracerService = new TracerServiceImplementation('chat-save-and-publish');
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

export interface SaveAndPublishEvent {
  sessionId: string;
  uid: string;
  userEmail: string;
  content: string;
  expenseId?: string;
}

/**
 * Terminal Step Functions task: persists the assistant's final message
 * and pushes it to AppSync Events so the client renders it in real time.
 *
 * Used by every branch (QUERY answer, CREATE confirmation, CREATE
 * cancellation, CREATE clarification). Preview messages take a different
 * path — see `sfn-save-preview.ts`.
 */
export const handler = async (event: SaveAndPublishEvent) => {
  const logger = new LoggerServiceImplementation('chat-save-and-publish');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('userId', event.uid);

  logger.info('Saving assistant message and publishing', { event });

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
      ...(event.expenseId !== undefined && { expenseId: event.expenseId }),
    });

    logger.info('Assistant message saved and published', {
      messageId: result.message.id,
    });
    metricsService.count('ChatAssistantMessagePublished');

    return { messageId: result.message.id };
  } finally {
    metricsService.publish();
  }
};
