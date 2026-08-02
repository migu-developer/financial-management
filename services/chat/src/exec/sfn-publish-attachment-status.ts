import {
  handler,
  type PublishAttachmentStatusEvent,
} from '@services/chat/handlers/sfn-publish-attachment-status';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

/**
 * Local runner for the status publish. Set OUTCOME to `ready`, `unsupported` or
 * `failed` to exercise each payload shape; a subscribed client should see the
 * event arrive on `{namespace}/{uid}/responses`.
 *
 *   APPSYNC_HTTP_DNS=... APPSYNC_CHAT_NAMESPACE=... AWS_REGION=us-east-2 \
 *   UID=<uid> OUTCOME=ready \
 *   pnpm run:file src/exec/sfn-publish-attachment-status.ts
 */
const uid = process.env['UID'] ?? 'local-user';
const outcome = (process.env['OUTCOME'] ??
  'ready') as PublishAttachmentStatusEvent['outcome'];

const event: PublishAttachmentStatusEvent = {
  uid,
  uploadKey: process.env['UPLOAD_KEY'] ?? `chat-attachments/${uid}/receipt.jpg`,
  outcome,
  ...(outcome === 'ready' && {
    readyKey: process.env['READY_KEY'] ?? `chat-ready/${uid}/receipt.jpg`,
    width: 1200,
    height: 1600,
  }),
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
