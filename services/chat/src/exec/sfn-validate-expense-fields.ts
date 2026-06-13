import {
  handler,
  type ValidateExpenseFieldsEvent,
} from '@services/chat/handlers/sfn-validate-expense-fields';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event: ValidateExpenseFieldsEvent = {
  rawJson:
    process.env['RAW_JSON'] ??
    '```json\n{"name":"Cena en La Trattoria","value":45000,"currencyCode":"COP","expenseTypeName":"egreso"}\n```',
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
