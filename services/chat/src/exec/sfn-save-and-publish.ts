import {
  handler,
  type SaveAndPublishEvent,
} from '@services/chat/handlers/sfn-save-and-publish';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

// Requires APPSYNC_HTTP_DNS + APPSYNC_CHAT_NAMESPACE in the environment
// (publishes a real event) and a session owned by USER_ID.
const event: SaveAndPublishEvent = {
  sessionId: process.env['CHAT_SESSION_ID'] ?? '',
  uid: process.env['USER_ID'] ?? '',
  userEmail: process.env['USER_EMAIL'] ?? 'test@example.com',
  content:
    process.env['CHAT_CONTENT'] ?? 'Mensaje de prueba del asistente (exec)',
  ...(process.env['EXPENSE_ID'] && {
    expenseId: process.env['EXPENSE_ID'],
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
