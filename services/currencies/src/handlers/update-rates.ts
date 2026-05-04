import type { ScheduledEvent } from '@services/shared/domain/interfaces/eventbridge';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresCurrencyRepository } from '@services/currencies/infrastructure/repositories/postgres-currency.repository';
import { PostgresExchangeRateRepository } from '@services/currencies/infrastructure/repositories/postgres-exchange-rate.repository';
import { ExchangeRateApiService } from '@services/currencies/infrastructure/services/exchange-rate-api.service';
import { UpdateExchangeRatesUseCase } from '@services/currencies/application/use-cases/update-exchange-rates.use-case';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('update-rates-service');

export const handler = async (event: ScheduledEvent) => {
  const logger = new LoggerServiceImplementation('update-exchange-rates');
  tracerService.annotateColdStart();
  tracerService.putAnnotation('trigger', 'eventbridge');

  try {
    const apiKey = process.env['EXCHANGE_RATE_API_KEY'];
    if (!apiKey) throw new Error('EXCHANGE_RATE_API_KEY not set');

    const apiBaseUrl = process.env['EXCHANGE_RATE_API_BASE_URL'];
    if (!apiBaseUrl) throw new Error('EXCHANGE_RATE_API_BASE_URL not set');

    logger.info('Starting exchange rate update', { event });

    const currencyRepository = new PostgresCurrencyRepository(dbService);
    const exchangeRateRepository = new PostgresExchangeRateRepository(
      dbService,
    );
    const apiService = new ExchangeRateApiService(apiBaseUrl);

    const useCase = new UpdateExchangeRatesUseCase(
      currencyRepository,
      exchangeRateRepository,
      apiService,
      apiKey,
    );

    const count = await useCase.execute();
    tracerService.putAnnotation('ratesUpdated', count);

    logger.info(`Exchange rates updated successfully: ${String(count)} rates`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated: count }),
    };
  } catch (error: unknown) {
    logger.error('Failed to update exchange rates', { error });
    throw error;
  }
};
