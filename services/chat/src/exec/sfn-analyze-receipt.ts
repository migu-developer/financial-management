import {
  handler,
  type AnalyzeReceiptEvent,
} from '@services/chat/handlers/sfn-analyze-receipt';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

/**
 * Local runner for the receipt-analysis task.
 *
 * Needs a REAL object already uploaded to the attachments bucket — Textract
 * reads it straight from S3. Upload one first with `src/exec/upload-url.ts`,
 * then pass the key it printed:
 *
 *   CHAT_ATTACHMENTS_BUCKET=migudev-fm-prod-us-east-2-chat-attachments \
 *   ATTACHMENT_S3_KEY=chat-attachments/<uid>/<uuid>.jpg \
 *   UID=<uid> pnpm run:file src/exec/sfn-analyze-receipt.ts
 */
const event: AnalyzeReceiptEvent = {
  uid: process.env['UID'] ?? 'local-user',
  sessionId: process.env['SESSION_ID'] ?? 'local-session',
  messageId: process.env['MESSAGE_ID'] ?? 'local-message',
  attachmentS3Key:
    process.env['ATTACHMENT_S3_KEY'] ??
    `chat-attachments/${process.env['UID'] ?? 'local-user'}/receipt.jpg`,
  content: process.env['CONTENT'] ?? 'registra este gasto del recibo',
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
