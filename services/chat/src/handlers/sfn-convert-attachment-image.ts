import { S3Client } from '@aws-sdk/client-s3';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { ConvertAttachmentImageUseCase } from '@services/chat/application/use-cases/normalize-attachment-image.use-case';
import { S3ObjectStorage } from '@services/chat/infrastructure/services/s3-object-storage.service';
import { SharpImageNormalizer } from '@services/chat/infrastructure/services/sharp-image-normalizer.service';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const tracerService = new TracerServiceImplementation('chat-convert-image');
const metricsService = new MetricsServiceImplementation('chat');
const attachmentsBucket = requireEnv(
  process.env['CHAT_ATTACHMENTS_BUCKET'],
  'CHAT_ATTACHMENTS_BUCKET',
);
const s3Client = tracerService.captureAWSv3Client(new S3Client({}));

/**
 * Step Functions task: rewrites the uploaded image into a Textract-accepted
 * JPEG within every hard limit, and writes it to the ready prefix.
 *
 * Needs more memory than the other chat Lambdas — libvips decodes the full
 * bitmap, and on Lambda more memory also means more CPU, so a larger size is
 * cheaper in wall-clock terms for the same work.
 */
export interface ConvertAttachmentImageEvent {
  uploadKey: string;
  readyKey: string;
}

export const handler = async (event: ConvertAttachmentImageEvent) => {
  const logger = new LoggerServiceImplementation('chat-convert-image');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('uploadKey', event.uploadKey);

  try {
    const useCase = new ConvertAttachmentImageUseCase(
      new S3ObjectStorage(attachmentsBucket, s3Client),
      new SharpImageNormalizer(),
    );

    const result = await useCase.execute({
      uploadKey: event.uploadKey,
      readyKey: event.readyKey,
    });

    metricsService.count('ChatImageConverted');
    logger.info('Converted uploaded attachment', { ...result });

    return result;
  } finally {
    metricsService.publish();
  }
};
