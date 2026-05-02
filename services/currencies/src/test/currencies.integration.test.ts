import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { CurrencySeeder } from './fixtures/catalogs.fixture';
import { ExchangeRateSeeder } from './fixtures/exchange-rate.fixture';
import { PostgresCurrencyRepository } from '@services/currencies/infrastructure/repositories/postgres-currency.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresCurrencyRepository;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresCurrencyRepository(dbService);
  await new CurrencySeeder(dbService).seed();
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresCurrencyRepository — integration', () => {
  it('returns all currencies', async () => {
    const currencies = await repo.findAll();
    expect(currencies).toHaveLength(3);
  });

  it('returns currencies ordered by code ASC', async () => {
    const currencies = await repo.findAll();
    const codes = currencies.map((c) => c.code);
    expect(codes).toEqual(['COP', 'EUR', 'USD']);
  });

  it('each currency has id, code, name, symbol and country', async () => {
    const currencies = await repo.findAll();
    for (const c of currencies) {
      expect(c.id).toBeDefined();
      expect(c.code).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.symbol).toBeDefined();
      expect(c.country).toBeDefined();
    }
  });
});

describe('PostgresCurrencyRepository.findAllWithLatestRates — integration', () => {
  it('returns currencies with null latest_rate when no exchange rates exist', async () => {
    const currencies = await repo.findAllWithLatestRates();
    expect(currencies).toHaveLength(3);
    for (const c of currencies) {
      expect(c).toHaveProperty('latest_rate');
      expect(c.latest_rate).toBeNull();
    }
  });

  it('returns currencies ordered by code ASC', async () => {
    const currencies = await repo.findAllWithLatestRates();
    const codes = currencies.map((c) => c.code);
    expect(codes).toEqual(['COP', 'EUR', 'USD']);
  });

  describe('when exchange rates exist', () => {
    beforeAll(async () => {
      const currencies = await repo.findAll();
      const usd = currencies.find((c) => c.code === 'USD')!;
      const cop = currencies.find((c) => c.code === 'COP')!;
      await new ExchangeRateSeeder(dbService).seed([
        {
          currency_id: usd.id,
          rate_to_usd: 1.0,
          rate_date: '2026-04-30',
        },
        {
          currency_id: cop.id,
          rate_to_usd: 0.000234,
          rate_date: '2026-04-30',
        },
      ]);
    });

    it('returns latest_rate for currencies that have exchange rates', async () => {
      const currencies = await repo.findAllWithLatestRates();

      const usd = currencies.find((c) => c.code === 'USD')!;
      expect(usd.latest_rate).not.toBeNull();
      expect(usd.latest_rate!.rate_to_usd).toBe(1.0);
      expect(usd.latest_rate!.rate_date).toBeDefined();

      const cop = currencies.find((c) => c.code === 'COP')!;
      expect(cop.latest_rate).not.toBeNull();
      expect(cop.latest_rate!.rate_to_usd).toBe(0.000234);
    });

    it('returns null latest_rate for currencies without exchange rates', async () => {
      const currencies = await repo.findAllWithLatestRates();
      const eur = currencies.find((c) => c.code === 'EUR')!;
      expect(eur.latest_rate).toBeNull();
    });
  });
});
