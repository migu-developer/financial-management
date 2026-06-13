import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';
import {
  ValidateExpenseFieldsUseCase,
  type ExtractedExpenseFields,
} from '@services/chat/application/use-cases/validate-expense-fields.use-case';
import { parseBedrockJson } from '@services/chat/domain/utils/parse-bedrock-json';

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
}

export const handler = async (event: ValidateExpenseFieldsEvent) => {
  const logger = new LoggerServiceImplementation(
    'chat-validate-expense-fields',
  );
  tracerService.annotateColdStart();

  const extracted = parseBedrockJson<ExtractedExpenseFields>(event.rawJson);
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
