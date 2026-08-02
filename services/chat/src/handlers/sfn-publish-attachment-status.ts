import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import {
  AppSyncEventPublisher,
  AppSyncPublishError,
} from '@services/chat/infrastructure/services/appsync-event-publisher.service';
import type { AttachmentEventPayload } from '@services/chat/domain/services/event-publisher.service';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const tracerService = new TracerServiceImplementation(
  'chat-publish-attachment',
);
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
// Same channel the chat replies use, so the client needs no second
// subscription and no extra IAM grant — only a new event `type`.
const channelTemplate = (uid: string) => `${namespace}/${uid}/responses`;

/**
 * User-facing text for the cases where an upload cannot be processed. Kept
 * STATIC (no Bedrock) so this path works even when the model layer is down.
 */
const REJECTION_MESSAGES = {
  unsupported:
    'No pude procesar esa imagen. ¿Puedes tomar la foto de nuevo o enviarla como JPG o PNG?',
  failed:
    'Uy, tuve un problema preparando tu imagen. ¿Lo intentamos de nuevo en un momento?',
} as const;

export type AttachmentStatusOutcome = keyof typeof REJECTION_MESSAGES | 'ready';

/**
 * Step Functions task: tells the client how the upload turned out.
 *
 * This is the ONLY signal the client gets — it holds the Send action until an
 * `attachment_ready` arrives carrying the normalized key, or shows the
 * rejection message.
 */
export interface PublishAttachmentStatusEvent {
  uid: string;
  uploadKey: string;
  outcome: AttachmentStatusOutcome;
  /** Required when `outcome === 'ready'`. */
  readyKey?: string;
  width?: number;
  height?: number;
}

export const handler = async (event: PublishAttachmentStatusEvent) => {
  const logger = new LoggerServiceImplementation('chat-publish-attachment');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('userId', event.uid);
  tracerService.putAnnotation('uploadKey', event.uploadKey);
  tracerService.putAnnotation('outcome', event.outcome);

  try {
    const payload: AttachmentEventPayload =
      event.outcome === 'ready'
        ? {
            type: 'attachment_ready',
            uploadKey: event.uploadKey,
            ...(event.readyKey !== undefined && { readyKey: event.readyKey }),
            ...(event.width !== undefined && { width: event.width }),
            ...(event.height !== undefined && { height: event.height }),
          }
        : {
            type: 'attachment_rejected',
            uploadKey: event.uploadKey,
            content: REJECTION_MESSAGES[event.outcome],
          };

    try {
      await publisher.publish(channelTemplate(event.uid), payload);
    } catch (error: unknown) {
      // Same treatment as the chat publisher: count the failure so
      // `Chat-PublishFailed` fires, then rethrow so the state machine's
      // catch-all still sees it.
      if (error instanceof AppSyncPublishError) {
        metricsService.count('ChatPublishFailed');
      }
      throw error;
    }

    metricsService.count(
      event.outcome === 'ready'
        ? 'ChatAttachmentReady'
        : 'ChatAttachmentRejected',
    );
    logger.info('Published attachment status', {
      outcome: event.outcome,
      readyKey: event.readyKey,
    });

    return { published: true, outcome: event.outcome };
  } finally {
    metricsService.publish();
  }
};
