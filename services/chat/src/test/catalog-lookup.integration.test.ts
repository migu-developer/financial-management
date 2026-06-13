import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { CatalogLookupRepository } from '@services/chat/infrastructure/repositories/catalog-lookup.repository';
import { seedAllCatalogs } from './fixtures/catalogs.fixture';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: CatalogLookupRepository;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new CatalogLookupRepository(dbService);
  await seedAllCatalogs(dbService);
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('CatalogLookupRepository — integration', () => {
  describe('findCurrencyIdByCode', () => {
    it('finds a currency by exact code', async () => {
      const id = await repo.findCurrencyIdByCode('COP');
      expect(id).toEqual(expect.any(String));
    });

    it('is case-insensitive', async () => {
      const upper = await repo.findCurrencyIdByCode('USD');
      const lower = await repo.findCurrencyIdByCode('usd');
      expect(lower).toBe(upper);
    });

    it('returns null for unknown codes', async () => {
      expect(await repo.findCurrencyIdByCode('XYZ')).toBeNull();
    });
  });

  describe('findExpenseTypeIdByName', () => {
    it('finds income and outcome types', async () => {
      expect(await repo.findExpenseTypeIdByName('income')).toEqual(
        expect.any(String),
      );
      expect(await repo.findExpenseTypeIdByName('outcome')).toEqual(
        expect.any(String),
      );
    });

    it('is case-insensitive', async () => {
      const exact = await repo.findExpenseTypeIdByName('outcome');
      expect(await repo.findExpenseTypeIdByName('OUTCOME')).toBe(exact);
    });

    it('returns null for the raw Spanish synonym (mapping happens in the use case)', async () => {
      expect(await repo.findExpenseTypeIdByName('egreso')).toBeNull();
    });
  });

  describe('findCategoryIdByName', () => {
    it('finds a category case-insensitively', async () => {
      const exact = await repo.findCategoryIdByName('Food');
      expect(exact).toEqual(expect.any(String));
      expect(await repo.findCategoryIdByName('food')).toBe(exact);
    });

    it('returns null for unknown categories', async () => {
      expect(await repo.findCategoryIdByName('Nope')).toBeNull();
    });
  });
});
