import {
  handler,
  type SavePreviewEvent,
} from '@services/chat/handlers/sfn-save-preview';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

// Requires APPSYNC_HTTP_DNS + APPSYNC_CHAT_NAMESPACE in the environment and
// a session owned by USER_ID. TASK_TOKEN is a fake token: the row is created
// with task_token_status='pending', so clean it up afterwards (or confirm it
// via POST /chat/confirm against a real execution).
const event: SavePreviewEvent = {
  sessionId: process.env['CHAT_SESSION_ID'] ?? '',
  uid: process.env['USER_ID'] ?? '',
  userEmail: process.env['USER_EMAIL'] ?? 'test@example.com',
  content:
    process.env['CHAT_CONTENT'] ??
    'Cena de prueba, 45000 COP, hoy. ¿Confirmás?',
  taskToken: process.env['TASK_TOKEN'] ?? `exec-test-token-${Date.now()}`,
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
