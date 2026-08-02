import { S3Client } from '@aws-sdk/client-s3';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';
import { ProbeAttachmentImageUseCase } from '@services/chat/application/use-cases/normalize-attachment-image.use-case';
import { S3ObjectStorage } from '@services/chat/infrastructure/services/s3-object-storage.service';
import { SharpImageNormalizer } from '@services/chat/infrastructure/services/sharp-image-normalizer.service';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const tracerService = new TracerServiceImplementation('chat-probe-image');
const metricsService = new MetricsServiceImplementation('chat');
const attachmentsBucket = requireEnv(
  process.env['CHAT_ATTACHMENTS_BUCKET'],
  'CHAT_ATTACHMENTS_BUCKET',
);
const s3Client = tracerService.captureAWSv3Client(new S3Client({}));

/**
 * Step Functions task: reads the uploaded image's metadata and decides whether
 * it needs rewriting before Textract will accept it.
 *
 * Split from the conversion step so the branch is visible in the state machine:
 * the SFN console shows how often uploads actually need work, and a future HEIC
 * converter becomes another branch rather than a change here.
 */
export interface ProbeAttachmentImageEvent {
  /** Key under `chat-attachments/`, from the S3 ObjectCreated event. */
  uploadKey: string;
}

export const handler = async (event: ProbeAttachmentImageEvent) => {
  const logger = new LoggerServiceImplementation('chat-probe-image');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('uploadKey', event.uploadKey);

  try {
    const useCase = new ProbeAttachmentImageUseCase(
      new S3ObjectStorage(attachmentsBucket, s3Client),
      new SharpImageNormalizer(),
    );

    const result = await useCase.execute({ uploadKey: event.uploadKey });

    tracerService.putAnnotation('userId', result.userId);
    tracerService.putAnnotation('imageDecision', result.decision);
    metricsService.count(
      result.decision === 'passthrough'
        ? 'ChatImagePassthrough'
        : result.decision === 'convert'
          ? 'ChatImageNeedsConversion'
          : 'ChatImageUnsupported',
    );

    logger.info('Probed uploaded attachment', {
      decision: result.decision,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      reasons: result.reasons,
    });

    return result;
  } finally {
    metricsService.publish();
  }
};
