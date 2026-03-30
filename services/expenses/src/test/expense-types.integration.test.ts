import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { ExpenseTypeSeeder } from './fixtures/catalogs.fixture';
import { PostgresExpenseTypeRepository } from '@services/expenses/infrastructure/repositories/postgres-expense-type.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresExpenseTypeRepository;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresExpenseTypeRepository(dbService);
  await new ExpenseTypeSeeder(dbService).seed();
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresExpenseTypeRepository — integration', () => {
  it('returns all expense types', async () => {
    const types = await repo.findAll();
    expect(types).toHaveLength(2);
  });

  it('returns income and outcome types', async () => {
    const types = await repo.findAll();
    const names = types.map((t) => t.name).sort();
    expect(names).toEqual(['income', 'outcome']);
  });

  it('each type has id and description', async () => {
    const types = await repo.findAll();
    for (const t of types) {
      expect(t.id).toBeDefined();
      expect(t.description).toBeDefined();
    }
  });
});
