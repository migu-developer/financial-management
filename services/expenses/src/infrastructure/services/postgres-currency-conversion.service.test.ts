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
  it('returns value * rate_to_usd when rate is found', async () => {
    const dbService = makeMockDbService();
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([
      { rate_to_usd: 0.00024 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    const result = await service.convert('cur-1', 50000);

    expect(result).toBe(12);
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
      { rate_to_usd: 0.00024 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    const result = await service.convert('cur-1', 0);

    expect(result).toBe(0);
  });

  it('handles fractional rates correctly', async () => {
    const dbService = makeMockDbService();
    (dbService.queryReadOnly as jest.Mock).mockResolvedValue([
      { rate_to_usd: 1.5 },
    ]);

    const service = new PostgresCurrencyConversionService(dbService);
    const result = await service.convert('cur-1', 100);

    expect(result).toBe(150);
  });
});
