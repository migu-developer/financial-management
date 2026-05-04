import { GetCurrenciesUseCase } from './get-currencies.use-case';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type { CurrencyWithRateEntity } from '@services/currencies/domain/entities/currency-with-rate.entity';

describe('GetCurrenciesUseCase', () => {
  it('returns currencies with latest rates from repository', async () => {
    const mockData: CurrencyWithRateEntity[] = [
      {
        id: 'uuid-1',
        code: 'COP',
        name: 'Peso Colombiano',
        symbol: '$',
        country: 'Colombia',
        latest_rate: { rate_to_usd: 0.000234, rate_date: '2026-04-30' },
      },
      {
        id: 'uuid-2',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        country: 'United States',
        latest_rate: { rate_to_usd: 1.0, rate_date: '2026-04-30' },
      },
    ];

    const repository: CurrencyRepository = {
      findAll: jest.fn(),
      findAllWithLatestRates: jest.fn().mockResolvedValue(mockData),
    };

    const useCase = new GetCurrenciesUseCase(repository);
    const result = await useCase.execute();

    expect(result).toEqual(mockData);
    expect(repository.findAllWithLatestRates).toHaveBeenCalledTimes(1);
  });

  it('returns currencies with null latest_rate when no rates exist', async () => {
    const mockData: CurrencyWithRateEntity[] = [
      {
        id: 'uuid-1',
        code: 'EUR',
        name: 'Euro',
        symbol: '\u20ac',
        country: 'Finland',
        latest_rate: null,
      },
    ];

    const repository: CurrencyRepository = {
      findAll: jest.fn(),
      findAllWithLatestRates: jest.fn().mockResolvedValue(mockData),
    };

    const useCase = new GetCurrenciesUseCase(repository);
    const result = await useCase.execute();

    expect(result).toEqual(mockData);
    expect(result[0]!.latest_rate).toBeNull();
  });

  it('propagates repository errors', async () => {
    const repository: CurrencyRepository = {
      findAll: jest.fn(),
      findAllWithLatestRates: jest
        .fn()
        .mockRejectedValue(new Error('DB failure')),
    };

    const useCase = new GetCurrenciesUseCase(repository);
    await expect(useCase.execute()).rejects.toThrow('DB failure');
  });
});
