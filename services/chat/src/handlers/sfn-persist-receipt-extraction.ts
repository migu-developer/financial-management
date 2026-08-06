import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import { PersistReceiptExtractionUseCase } from '@services/chat/application/use-cases/persist-receipt-extraction.use-case';
import type { ChatAttachmentExtraction } from '@services/chat/domain/entities/chat-message';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation(
  'chat-persist-receipt-extraction',
);
const metricsService = new MetricsServiceImplementation('chat');

/**
 * Step Functions task: banks what Textract read onto the user message that
 * carried the image.
 *
 * A SEPARATE Lambda from AnalyzeReceipt on purpose. That one processes an
 * arbitrary user-supplied image and deliberately holds no database credentials
 * ("this task only reads an image"), so the write lives here instead of
 * widening its blast radius.
 *
 * Placed immediately after the read rather than at the end of the workflow: the
 * Textract call costs money, is rate limited (1 TPS for AnalyzeExpense in
 * us-east-2), and the raw upload is deleted after 7 days — so the result is
 * banked before anything else can fail.
 */
export interface PersistReceiptExtractionEvent {
  uid: string;
  /** Stamped on `modified_by`, matching every other write in this service. */
  userEmail: string;
  sessionId?: string;
  /** The user message the attachment arrived on. */
  messageId: string;
  /** Fields AnalyzeReceipt read; may be empty for an unreadable receipt. */
  extraction: ChatAttachmentExtraction;
}

export const handler = async (event: PersistReceiptExtractionEvent) => {
  const logger = new LoggerServiceImplementation(
    'chat-persist-receipt-extraction',
  );
  tracerService.annotateColdStart();
  if (event.uid) tracerService.putAnnotation('userId', event.uid);
  if (event.sessionId)
    tracerService.putAnnotation('sessionId', event.sessionId);
  if (event.messageId)
    tracerService.putAnnotation('messageId', event.messageId);

  try {
    const useCase = new PersistReceiptExtractionUseCase(
      new PostgresChatMessageRepository(dbService),
    );

    const result = await useCase.execute({
      messageId: event.messageId,
      userId: event.uid,
      userEmail: event.userEmail,
      extraction: event.extraction ?? {},
    });

    tracerService.putAnnotation('extractionStored', String(result.stored));
    metricsService.count(
      result.stored
        ? 'ChatReceiptExtractionStored'
        : 'ChatReceiptExtractionEmpty',
    );
    logger.info('Receipt extraction persistence finished', {
      stored: result.stored,
    });

    return result;
  } finally {
    metricsService.publish();
  }
};
