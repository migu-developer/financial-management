import { handler } from '@services/chat/handlers/sfn-create-expense';
import type { CreateExpenseFromChatInput } from '@services/chat/application/use-cases/create-expense-from-chat.use-case';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

// CURRENCY_ID / EXPENSE_TYPE_ID must be real catalog ids of the target DB.
const event: CreateExpenseFromChatInput = {
  uid: process.env['USER_ID'] ?? '',
  userEmail: process.env['USER_EMAIL'] ?? 'test@example.com',
  fields: {
    name: process.env['EXPENSE_NAME'] ?? 'Cena de prueba (exec)',
    value: Number(process.env['EXPENSE_VALUE'] ?? 45000),
    currency_id: process.env['CURRENCY_ID'] ?? '',
    expense_type_id: process.env['EXPENSE_TYPE_ID'] ?? '',
    ...(process.env['EXPENSE_CATEGORY_ID'] && {
      expense_category_id: process.env['EXPENSE_CATEGORY_ID'],
    }),
    ...(process.env['EXPENSE_DATE'] && {
      date: process.env['EXPENSE_DATE'],
    }),
  },
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
