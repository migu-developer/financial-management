import { UpdateExchangeRatesUseCase } from './update-exchange-rates.use-case';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type { ExchangeRateRepository } from '@services/currencies/domain/repositories/exchange-rate.repository';
import type { ExchangeRateApiService } from '@services/currencies/infrastructure/services/exchange-rate-api.service';
import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';

const mockCurrencies: CurrencyEntity[] = [
  {
    id: 'id-cop',
    code: 'COP',
    name: 'Peso Colombiano',
    symbol: '$',
    country: 'Colombia',
  },
  {
    id: 'id-usd',
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    country: 'United States',
  },
  {
    id: 'id-eur',
    code: 'EUR',
    name: 'Euro',
    symbol: '\u20AC',
    country: 'Finland',
  },
];

function makeMockCurrencyRepository(): jest.Mocked<CurrencyRepository> {
  return {
    findAll: jest.fn().mockResolvedValue(mockCurrencies),
    findAllWithLatestRates: jest.fn().mockResolvedValue([]),
  };
}

function makeMockExchangeRateRepository(): jest.Mocked<ExchangeRateRepository> {
  return {
    upsertRates: jest.fn().mockResolvedValue(undefined),
    findLatestByCurrencyId: jest.fn().mockResolvedValue(null),
    findAllLatest: jest.fn().mockResolvedValue([]),
  };
}

function makeMockApiService(): jest.Mocked<ExchangeRateApiService> {
  return {
    baseUrl: 'https://api.example.com',
    fetchRates: jest.fn().mockResolvedValue({
      COP: 4150.5,
      USD: 1,
      EUR: 0.92,
    }),
  } as unknown as jest.Mocked<ExchangeRateApiService>;
}

describe('UpdateExchangeRatesUseCase', () => {
  it('maps API rates to currencies and calls upsertRates', async () => {
    const currencyRepo = makeMockCurrencyRepository();
    const exchangeRateRepo = makeMockExchangeRateRepository();
    const apiService = makeMockApiService();

    const useCase = new UpdateExchangeRatesUseCase(
      currencyRepo,
      exchangeRateRepo,
      apiService,
      'test-api-key',
    );

    const count = await useCase.execute();

    expect(count).toBe(3);
    expect(apiService.fetchRates).toHaveBeenCalledWith('test-api-key');
    expect(exchangeRateRepo.upsertRates).toHaveBeenCalledTimes(1);

    const upsertedRates = exchangeRateRepo.upsertRates.mock.calls[0]![0];
    expect(upsertedRates).toHaveLength(3);

    const copRate = upsertedRates.find((r) => r.currency_id === 'id-cop');
    expect(copRate).toMatchObject({
      currency_id: 'id-cop',
      rate_to_usd: 4150.5,
      source: 'exchangerate-api.com',
    });
  });

  it('skips currencies not found in API response', async () => {
    const currencyRepo = makeMockCurrencyRepository();
    const exchangeRateRepo = makeMockExchangeRateRepository();
    const apiService = makeMockApiService();
    apiService.fetchRates.mockResolvedValue({ USD: 1 });

    const useCase = new UpdateExchangeRatesUseCase(
      currencyRepo,
      exchangeRateRepo,
      apiService,
      'test-api-key',
    );

    const count = await useCase.execute();

    expect(count).toBe(1);
    const upsertedRates = exchangeRateRepo.upsertRates.mock.calls[0]![0];
    expect(upsertedRates).toHaveLength(1);
    expect(upsertedRates[0]!.currency_id).toBe('id-usd');
  });

  it('does not call upsertRates when no currencies match', async () => {
    const currencyRepo = makeMockCurrencyRepository();
    const exchangeRateRepo = makeMockExchangeRateRepository();
    const apiService = makeMockApiService();
    apiService.fetchRates.mockResolvedValue({ GBP: 0.79 });

    const useCase = new UpdateExchangeRatesUseCase(
      currencyRepo,
      exchangeRateRepo,
      apiService,
      'test-api-key',
    );

    const count = await useCase.execute();

    expect(count).toBe(0);
    expect(exchangeRateRepo.upsertRates).not.toHaveBeenCalled();
  });

  it('propagates API errors', async () => {
    const currencyRepo = makeMockCurrencyRepository();
    const exchangeRateRepo = makeMockExchangeRateRepository();
    const apiService = makeMockApiService();
    apiService.fetchRates.mockRejectedValue(new Error('API timeout'));

    const useCase = new UpdateExchangeRatesUseCase(
      currencyRepo,
      exchangeRateRepo,
      apiService,
      'test-api-key',
    );

    await expect(useCase.execute()).rejects.toThrow('API timeout');
    expect(exchangeRateRepo.upsertRates).not.toHaveBeenCalled();
  });
});
