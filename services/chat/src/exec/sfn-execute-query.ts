import {
  handler,
  type ExecuteQueryEvent,
} from '@services/chat/handlers/sfn-execute-query';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event: ExecuteQueryEvent = {
  uid: process.env['USER_ID'] ?? '',
  rawJson:
    process.env['RAW_JSON'] ??
    '```json\n{"queryType":"metrics","filters":{"expenseTypeName":"egreso"}}\n```',
  today: process.env['TODAY'] ?? new Date().toISOString(),
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
