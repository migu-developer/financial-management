import { PostgresCurrencyConversionService } from './postgres-currency-conversion.service';
import type { DatabaseService } from '@services/shared/domain/services/database';

function makeMockDbService(): DatabaseService {
  return {
    query: jest.fn(),
    queryReadOnly: jest.fn(),
    end: jest.fn(),
  };
}

describe('PostgresCurrencyConversionService', () => {
  it('returns value / rate_to_usd when rate is found', async () => {
    const dbService = makeMockDbService();
    // COP rate: 1 USD = 4000 COP
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([
      { rate_to_usd: 4000 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    // 100,000 COP / 4000 = 25 USD
    const result = await service.convert('cur-1', 100000);

    expect(result).toBe(25);
    expect(dbService.queryReadOnly).toHaveBeenCalledWith(
      expect.stringContaining('v_latest_exchange_rates'),
      ['cur-1'],
    );
  });

  it('returns null when no exchange rate is found', async () => {
    const dbService = makeMockDbService();
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([]);

    const service = new PostgresCurrencyConversionService(dbService);
    const result = await service.convert('unknown-cur', 100);

    expect(result).toBeNull();
  });

  it('returns 0 when value is 0', async () => {
    const dbService = makeMockDbService();
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([
      { rate_to_usd: 4000 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    const result = await service.convert('cur-1', 0);

    expect(result).toBe(0);
  });

  it('handles fractional rates correctly', async () => {
    const dbService = makeMockDbService();
    // EUR rate: 1 USD = 0.85 EUR
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([
      { rate_to_usd: 0.85 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    // 100 EUR / 0.85 = ~117.65 USD
    const result = await service.convert('cur-1', 100);

    expect(result).toBeCloseTo(117.647, 2);
  });
});
