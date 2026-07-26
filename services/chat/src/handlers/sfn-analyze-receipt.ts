import { TextractClient } from '@aws-sdk/client-textract';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { AnalyzeReceiptUseCase } from '@services/chat/application/use-cases/analyze-receipt.use-case';
import { TextractReceiptAnalyzer } from '@services/chat/infrastructure/services/textract-receipt-analyzer.service';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const tracerService = new TracerServiceImplementation('chat-analyze-receipt');
const metricsService = new MetricsServiceImplementation('chat');
const attachmentsBucket = requireEnv(
  process.env['CHAT_ATTACHMENTS_BUCKET'],
  'CHAT_ATTACHMENTS_BUCKET',
);
const textractClient = tracerService.captureAWSv3Client(new TextractClient({}));

/**
 * Step Functions task: reads a receipt image with Textract `AnalyzeExpense`
 * and returns the message content enriched with whatever it found.
 *
 * Runs BEFORE intent classification, so everything downstream (classify →
 * extract → validate → preview → create) is untouched by attachments: it
 * simply sees a longer `$.content`.
 */
export interface AnalyzeReceiptEvent {
  uid: string;
  sessionId?: string;
  messageId?: string;
  /** Key issued by `POST /chat/upload-url`. */
  attachmentS3Key: string;
  /** The user's caption; empty when they sent only a photo. */
  content: string;
}

export const handler = async (event: AnalyzeReceiptEvent) => {
  const logger = new LoggerServiceImplementation('chat-analyze-receipt');
  tracerService.annotateColdStart();
  if (event.uid) tracerService.putAnnotation('userId', event.uid);
  if (event.sessionId)
    tracerService.putAnnotation('sessionId', event.sessionId);
  if (event.messageId)
    tracerService.putAnnotation('messageId', event.messageId);

  try {
    const analyzer = new TextractReceiptAnalyzer(
      attachmentsBucket,
      textractClient,
    );
    const useCase = new AnalyzeReceiptUseCase(analyzer);

    const result = await useCase.execute({
      userId: event.uid,
      s3Key: event.attachmentS3Key,
      caption: event.content ?? '',
    });

    tracerService.putAnnotation('receiptExtracted', String(result.extracted));
    metricsService.count(
      result.extracted ? 'ChatReceiptExtracted' : 'ChatReceiptUnreadable',
    );

    logger.info('Receipt analysis finished', {
      extracted: result.extracted,
      confidence: result.confidence,
    });

    return result;
  } finally {
    metricsService.publish();
  }
};
