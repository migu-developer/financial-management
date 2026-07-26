import {
  handler,
  type ProbeAttachmentImageEvent,
} from '@services/chat/handlers/sfn-probe-attachment-image';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

/**
 * Local runner for the probe task.
 *
 * Needs a REAL object under the upload prefix — sharp reads the actual bytes:
 *
 *   CHAT_ATTACHMENTS_BUCKET=migudev-fm-prod-us-east-2-chat-attachments \
 *   UPLOAD_KEY=chat-attachments/<uid>/<uuid>.jpg \
 *   pnpm run:file src/exec/sfn-probe-attachment-image.ts
 */
const event: ProbeAttachmentImageEvent = {
  uploadKey:
    process.env['UPLOAD_KEY'] ??
    `chat-attachments/${process.env['UID'] ?? 'local-user'}/receipt.jpg`,
};

handler(event)
  .then((result) => {
    const logger = new LoggerServiceImplementation();
    logger.info(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    const logger = new LoggerServiceImplementation();
    logger.error(JSON.stringify(error, null, 2));
  });
