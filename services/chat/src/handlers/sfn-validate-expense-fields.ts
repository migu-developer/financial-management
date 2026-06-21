import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';
import {
  ValidateExpenseFieldsUseCase,
  type ExtractedExpenseFields,
} from '@services/chat/application/use-cases/validate-expense-fields.use-case';
import { tryParseBedrockJson } from '@services/chat/domain/utils/parse-bedrock-json';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation(
  'chat-validate-expense-fields',
);

/**
 * Step Functions task: parses the raw JSON Nova Lite produced and maps
 * its catalog names to IDs. Lives inside the Lambda (instead of a Pass
 * state) so we can tolerate the optional markdown fence Nova sometimes
 * adds.
 */
export interface ValidateExpenseFieldsEvent {
  rawJson: string;
  uid?: string;
  sessionId?: string;
  messageId?: string;
}

export const handler = async (event: ValidateExpenseFieldsEvent) => {
  const logger = new LoggerServiceImplementation(
    'chat-validate-expense-fields',
  );
  tracerService.annotateColdStart();
  if (event.uid) tracerService.putAnnotation('userId', event.uid);
  if (event.sessionId)
    tracerService.putAnnotation('sessionId', event.sessionId);
  if (event.messageId)
    tracerService.putAnnotation('messageId', event.messageId);

  const parsed = tryParseBedrockJson<ExtractedExpenseFields>(event.rawJson);
  if (parsed === null) {
    // Nova returned non-JSON. Treat as "no fields extracted" so validation
    // reports the expense as incomplete and the workflow routes to a friendly
    // clarification — never a States.TaskFailed on malformed input.
    logger.warn('Malformed expense-fields JSON from model; treating as empty', {
      rawJson: event.rawJson,
    });
  }
  const extracted: ExtractedExpenseFields = parsed ?? {};
  logger.info('Validating extracted expense fields', { extracted });

  const catalogLookup = new CatalogLookupRepository(dbService);
  const useCase = new ValidateExpenseFieldsUseCase(catalogLookup);

  const result = await useCase.execute(extracted);
  tracerService.putAnnotation('complete', String(result.complete));
  logger.info('Expense field validation result', {
    complete: result.complete,
    missingCount: result.missing.length,
  });

  return result;
};
