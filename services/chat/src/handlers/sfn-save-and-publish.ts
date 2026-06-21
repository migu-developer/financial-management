import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import {
  AppSyncEventPublisher,
  AppSyncPublishError,
} from '@services/chat/infrastructure/services/appsync-event-publisher.service';
import { SaveAssistantMessageUseCase } from '@services/chat/application/use-cases/save-assistant-message.use-case';

import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('chat-save-and-publish');
const metricsService = new MetricsServiceImplementation('chat');
const publisher = new AppSyncEventPublisher(
  requireEnv(process.env['APPSYNC_HTTP_DNS'], 'APPSYNC_HTTP_DNS'),
  requireEnv(process.env['AWS_REGION'], 'AWS_REGION'),
  tracerService,
);
const namespace = requireEnv(
  process.env['APPSYNC_CHAT_NAMESPACE'],
  'APPSYNC_CHAT_NAMESPACE',
);
const channelTemplate = (uid: string) => `${namespace}/${uid}/responses`;

/**
 * Which workflow branch produced this terminal message. Drives a per-branch
 * business metric so each outcome (query answered, expense confirmed, etc.)
 * can be tracked independently. `'error'` is set by the workflow's catch-all.
 */
export type SaveAndPublishEventKind =
  | 'query'
  | 'created'
  | 'cancelled'
  | 'clarification'
  | 'unknown'
  | 'error';

export interface SaveAndPublishEvent {
  sessionId: string;
  messageId?: string;
  uid: string;
  userEmail: string;
  content: string;
  expenseId?: string;
  /**
   * Set to `'error'` by the workflow's catch-all (PublishError) so the message
   * is published as a `type: 'error'` event — the client turns off the typing
   * indicator and renders the friendly retry message instead of hanging.
   */
  eventKind?: SaveAndPublishEventKind;
}

/**
 * Maps a non-error workflow branch to its dedicated business-metric name. Pure
 * and exported so the mapping can be unit-tested without invoking the handler.
 */
export const BRANCH_METRIC_BY_KIND: Record<
  Exclude<SaveAndPublishEventKind, 'error'>,
  string
> = {
  query: 'ChatQueryAnswerSent',
  created: 'ChatExpenseConfirmationSent',
  cancelled: 'ChatExpenseCancelled',
  clarification: 'ChatClarificationSent',
  unknown: 'ChatUnknownIntent',
};

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
  if (event.uid) tracerService.putAnnotation('userId', event.uid);
  if (event.sessionId)
    tracerService.putAnnotation('sessionId', event.sessionId);
  if (event.messageId)
    tracerService.putAnnotation('messageId', event.messageId);

  logger.info('Saving assistant message and publishing', { event });

  const sessionRepository = new PostgresChatSessionRepository(dbService);
  const messageRepository = new PostgresChatMessageRepository(dbService);

  const useCase = new SaveAssistantMessageUseCase(
    sessionRepository,
    messageRepository,
    publisher,
    channelTemplate,
  );

  const isError = event.eventKind === 'error';

  try {
    const result = await useCase.execute({
      sessionId: event.sessionId,
      uid: event.uid,
      userEmail: event.userEmail,
      content: event.content,
      ...(event.expenseId !== undefined && { expenseId: event.expenseId }),
      ...(isError && { eventType: 'error' as const }),
    });

    logger.info('Assistant message saved and published', {
      messageId: result.message.id,
      eventKind: event.eventKind ?? 'assistant_message',
    });
    if (isError) {
      // A terminal-failure publish is the workflow's last-resort user reply —
      // track it separately so we can alarm on it (catch-all activations).
      metricsService.count('ChatWorkflowError');
    } else {
      metricsService.count('ChatAssistantMessagePublished');
      // Also emit a per-branch counter so each outcome can be tracked on its
      // own (query answered vs. expense confirmed vs. cancelled, etc.).
      // `isError` is false here, so eventKind is a non-error branch (or absent).
      const branchMetric =
        event.eventKind && event.eventKind !== 'error'
          ? BRANCH_METRIC_BY_KIND[event.eventKind]
          : undefined;
      if (branchMetric) metricsService.count(branchMetric);
    }

    return { messageId: result.message.id };
  } catch (error) {
    // The publish itself failed: count it before rethrowing so the SFN
    // catch-all still fires (which re-invokes this handler with eventKind:
    // 'error' as the last-resort user reply).
    if (error instanceof AppSyncPublishError) {
      metricsService.count('ChatPublishFailed');
    }
    throw error;
  } finally {
    metricsService.publish();
  }
};
