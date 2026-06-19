import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresExpenseRepository } from '@services/expenses/infrastructure/repositories/postgres-expense.repository';
import { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';
import {
  ExecuteQueryUseCase,
  type ExtractedQueryFilters,
} from '@services/chat/application/use-cases/execute-query.use-case';
import { tryParseBedrockJson } from '@services/chat/domain/utils/parse-bedrock-json';

import { MetricsServiceImplementation } from '@services/shared/infrastructure/services/MetricsServiceImp';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('chat-execute-query');
const metricsService = new MetricsServiceImplementation('chat');

/**
 * Step Functions task: receives the raw JSON string Nova Lite produced
 * plus the calling user. We parse the JSON here (instead of in a Pass
 * state) because Nova sometimes wraps its output in a ```json fence even
 * when told not to.
 */
export interface ExecuteQueryEvent {
  uid: string;
  rawJson: string;
  /** ISO timestamp from the Step Functions context ($$.Execution.StartTime). */
  today: string;
}

export const handler = async (event: ExecuteQueryEvent) => {
  const logger = new LoggerServiceImplementation('chat-execute-query');
  tracerService.annotateColdStart();

  const parsed = tryParseBedrockJson<{
    queryType?: 'list' | 'metrics';
    filters?: ExtractedQueryFilters;
  }>(event.rawJson);

  if (parsed === null) {
    // Nova returned non-JSON. Degrade to a generic metrics query (no filters)
    // instead of throwing, so the user still gets a reply and we don't alarm
    // on a malformed-input case. The catch-all error path remains the backstop
    // for genuine failures (DB down, etc.).
    logger.warn('Malformed query JSON from model; falling back to metrics', {
      rawJson: event.rawJson,
    });
    metricsService.count('ChatMalformedModelJson');
  }

  const queryType = parsed?.queryType === 'list' ? 'list' : 'metrics';
  const filters = parsed?.filters ?? {};

  tracerService.putAnnotation('queryType', queryType);
  logger.info('Executing chat query', {
    uid: event.uid,
    queryType,
    filters,
  });

  const expenseRepository = new PostgresExpenseRepository(dbService);
  const catalogLookup = new CatalogLookupRepository(dbService);
  const useCase = new ExecuteQueryUseCase(expenseRepository, catalogLookup);

  try {
    const result = await useCase.execute({
      uid: event.uid,
      queryType,
      filters,
      today: event.today.slice(0, 10),
    });

    logger.info('Chat query executed', {
      kind: result.kind,
      count: result.kind === 'list' ? result.rows.length : undefined,
    });
    metricsService.count('ChatQueryExecuted');

    return result;
  } finally {
    metricsService.publish();
  }
};
