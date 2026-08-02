import {
  handler,
  type ConvertAttachmentImageEvent,
} from '@services/chat/handlers/sfn-convert-attachment-image';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

/**
 * Local runner for the conversion task. WRITES to the ready prefix, so point it
 * at a bucket you are happy to write into:
 *
 *   CHAT_ATTACHMENTS_BUCKET=... \
 *   UPLOAD_KEY=chat-attachments/<uid>/<uuid>.webp \
 *   READY_KEY=chat-ready/<uid>/<uuid>.jpg \
 *   pnpm run:file src/exec/sfn-convert-attachment-image.ts
 */
const uid = process.env['UID'] ?? 'local-user';
const event: ConvertAttachmentImageEvent = {
  uploadKey:
    process.env['UPLOAD_KEY'] ?? `chat-attachments/${uid}/receipt.webp`,
  readyKey: process.env['READY_KEY'] ?? `chat-ready/${uid}/receipt.jpg`,
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
