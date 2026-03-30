import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { CurrencySeeder } from './fixtures/catalogs.fixture';
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
