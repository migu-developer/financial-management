import { GetLatestRatesUseCase } from './get-latest-rates.use-case';
import type { ExchangeRateRepository } from '@services/currencies/domain/repositories/exchange-rate.repository';
import type { LatestExchangeRate } from '@services/currencies/domain/entities/exchange-rate.entity';

const mockLatestRates: LatestExchangeRate[] = [
  {
    currency_id: 'id-cop',
    rate_to_usd: 4150.5,
    rate_date: '2026-04-30',
    source: 'exchangerate-api.com',
  },
  {
    currency_id: 'id-usd',
    rate_to_usd: 1,
    rate_date: '2026-04-30',
    source: 'exchangerate-api.com',
  },
];

function makeMockExchangeRateRepository(): jest.Mocked<ExchangeRateRepository> {
  return {
    upsertRates: jest.fn().mockResolvedValue(undefined),
    findLatestByCurrencyId: jest.fn().mockResolvedValue(null),
    findAllLatest: jest.fn().mockResolvedValue(mockLatestRates),
  };
}

describe('GetLatestRatesUseCase', () => {
  it('returns all latest rates', async () => {
    const repository = makeMockExchangeRateRepository();
    const useCase = new GetLatestRatesUseCase(repository);

    const result = await useCase.execute();

    expect(result).toEqual(mockLatestRates);
    expect(repository.findAllLatest).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no rates exist', async () => {
    const repository = makeMockExchangeRateRepository();
    repository.findAllLatest.mockResolvedValue([]);
    const useCase = new GetLatestRatesUseCase(repository);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
