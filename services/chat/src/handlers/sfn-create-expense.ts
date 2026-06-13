import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresExpenseRepository } from '@services/expenses/infrastructure/repositories/postgres-expense.repository';
import { PostgresCurrencyConversionService } from '@services/expenses/infrastructure/services/postgres-currency-conversion.service';
import {
  CreateExpenseFromChatUseCase,
  type CreateExpenseFromChatInput,
} from '@services/chat/application/use-cases/create-expense-from-chat.use-case';

import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('chat-create-expense');
const metricsService = new MetricsServiceImplementation('chat');

/**
 * Step Functions task: persists the expense the user just confirmed.
 * Delegates to the existing expense create use case, so currency conversion
 * and all business rules stay in one place.
 */
export const handler = async (event: CreateExpenseFromChatInput) => {
  const logger = new LoggerServiceImplementation('chat-create-expense');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('userId', event.uid);

  logger.info('Creating expense from chat', { event });

  const expenseRepository = new PostgresExpenseRepository(dbService);
  const conversionService = new PostgresCurrencyConversionService(dbService);
  const useCase = new CreateExpenseFromChatUseCase(
    expenseRepository,
    conversionService,
  );

  try {
    const expense = await useCase.execute(event);
    logger.info('Expense created from chat', { expenseId: expense.id });
    metricsService.count('ChatExpenseCreated');
    return { expense };
  } finally {
    metricsService.publish();
  }
};
