import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { ExpenseCategorySeeder } from './fixtures/catalogs.fixture';
import { PostgresExpenseCategoryRepository } from '@services/expenses/infrastructure/repositories/postgres-expense-category.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresExpenseCategoryRepository;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresExpenseCategoryRepository(dbService);
  await new ExpenseCategorySeeder(dbService).seed();
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresExpenseCategoryRepository — integration', () => {
  it('returns all expense categories', async () => {
    const categories = await repo.findAll();
    expect(categories).toHaveLength(2);
  });

  it('returns categories ordered by name ASC', async () => {
    const categories = await repo.findAll();
    expect(categories[0]!.name).toBe('Food');
    expect(categories[1]!.name).toBe('Transport');
  });

  it('each category has id, name and description', async () => {
    const categories = await repo.findAll();
    for (const c of categories) {
      expect(c.id).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.description).toBeDefined();
    }
  });
});
