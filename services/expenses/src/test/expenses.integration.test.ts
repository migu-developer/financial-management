import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { UserFixture } from '@services/shared/test/fixtures/users.fixture';
import type { TestUser } from '@services/shared/test/fixtures/users.fixture';
import { seedAllCatalogs } from './fixtures/catalogs.fixture';
import { ExpenseFixture } from './fixtures/expenses.fixture';
import { PostgresExpenseRepository } from '@services/expenses/infrastructure/repositories/postgres-expense.repository';
import type {
  TestCurrency,
  TestExpenseType,
  TestExpenseCategory,
} from './fixtures/catalogs.fixture';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let userFixture: UserFixture;
let repo: PostgresExpenseRepository;
let userA: TestUser;
let userB: TestUser;
let currency: TestCurrency;
let incomeType: TestExpenseType;
let outcomeType: TestExpenseType;
let foodCategory: TestExpenseCategory;
let transportCategory: TestExpenseCategory;

// Keep backward-compatible aliases used by existing tests
let category: TestExpenseCategory;

beforeAll(async () => {
  await dbService.createSchema();
  userFixture = new UserFixture(dbService);
  repo = new PostgresExpenseRepository(dbService);

  const catalogs = await seedAllCatalogs(dbService);
  currency = catalogs.currencies[0]!;
  incomeType = catalogs.expenseTypes.find((t) => t.name === 'income')!;
  outcomeType = catalogs.expenseTypes.find((t) => t.name === 'outcome')!;
  foodCategory = catalogs.expenseCategories.find((c) => c.name === 'Food')!;
  transportCategory = catalogs.expenseCategories.find(
    (c) => c.name === 'Transport',
  )!;
  category = foodCategory;
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

beforeEach(async () => {
  await dbService.truncate('expenses', 'users', 'audit_logs');
  userA = await userFixture.insert();
  userB = await userFixture.insert();
});

describe('PostgresExpenseRepository — integration', () => {
  describe('create', () => {
    it('creates an expense and returns it with generated fields', async () => {
      const expense = await repo.create(
        {
          name: 'Lunch',
          value: 25000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
          expense_category_id: category.id,
        },
        userA.uid,
        userA.email,
      );

      expect(expense.id).toBeDefined();
      expect(expense.user_id).toBe(userA.id);
      expect(expense.name).toBe('Lunch');
      expect(expense.currency_id).toBe(currency.id);
      expect(expense.expense_type_id).toBe(outcomeType.id);
      expect(expense.expense_category_id).toBe(category.id);
      expect(expense.created_by).toBe(userA.email);
      expect(expense.created_at).toBeDefined();
    });

    it('creates an expense without optional category', async () => {
      const expense = await repo.create(
        {
          name: 'Misc',
          value: 5000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      expect(expense.expense_category_id).toBeNull();
    });

    it('throws when uid does not match any user', async () => {
      await expect(
        repo.create(
          {
            name: 'Ghost',
            value: 100,
            currency_id: currency.id,
            expense_type_id: outcomeType.id,
          },
          'non-existent-uid',
          'ghost@test.com',
        ),
      ).rejects.toThrow();
    });
  });

  describe('findAllByUserUid', () => {
    it('returns expenses only for the given user', async () => {
      const fixtureA = new ExpenseFixture(dbService, userA.id);
      const fixtureB = new ExpenseFixture(dbService, userB.id);
      await fixtureA.insert({
        name: 'A expense',
        value: 1000,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixtureB.insert({
        name: 'B expense',
        value: 2000,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const result = await repo.findAllByUserUid(userA.uid, { limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('A expense');
    });

    it('returns empty array when user has no expenses', async () => {
      const result = await repo.findAllByUserUid(userA.uid, { limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.has_more).toBe(false);
      expect(result.next_cursor).toBeNull();
      expect(result.total_count).toBe(0);
    });

    it('returns expenses ordered by created_at DESC', async () => {
      const fixture = new ExpenseFixture(dbService, userA.id);
      await fixture.insert({
        name: 'First',
        value: 100,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixture.insert({
        name: 'Second',
        value: 200,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const result = await repo.findAllByUserUid(userA.uid, { limit: 20 });

      expect(result.data[0]!.name).toBe('Second');
      expect(result.data[1]!.name).toBe('First');
    });

    it('paginates with limit and cursor', async () => {
      const fixture = new ExpenseFixture(dbService, userA.id);
      await fixture.insert({
        name: 'Expense 1',
        value: 100,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixture.insert({
        name: 'Expense 2',
        value: 200,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixture.insert({
        name: 'Expense 3',
        value: 300,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const page1 = await repo.findAllByUserUid(userA.uid, { limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.has_more).toBe(true);
      expect(page1.next_cursor).not.toBeNull();
      expect(page1.total_count).toBe(3);

      const page2 = await repo.findAllByUserUid(userA.uid, {
        limit: 2,
        cursor: page1.next_cursor!,
      });
      expect(page2.data).toHaveLength(1);
      expect(page2.has_more).toBe(false);
      expect(page2.next_cursor).toBeNull();
      expect(page2.total_count).toBeUndefined();
    });
  });

  describe('countByUserUid', () => {
    it('returns 0 when user has no expenses', async () => {
      const count = await repo.countByUserUid(userA.uid);
      expect(count).toBe(0);
    });

    it('returns correct count for user', async () => {
      const fixture = new ExpenseFixture(dbService, userA.id);
      await fixture.insert({
        name: 'Expense 1',
        value: 100,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixture.insert({
        name: 'Expense 2',
        value: 200,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const count = await repo.countByUserUid(userA.uid);
      expect(count).toBe(2);
    });

    it('does not count other users expenses', async () => {
      const fixtureA = new ExpenseFixture(dbService, userA.id);
      const fixtureB = new ExpenseFixture(dbService, userB.id);
      await fixtureA.insert({
        name: 'A',
        value: 100,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });
      await fixtureB.insert({
        name: 'B',
        value: 200,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      expect(await repo.countByUserUid(userA.uid)).toBe(1);
      expect(await repo.countByUserUid(userB.uid)).toBe(1);
    });
  });

  describe('findByIdAndUserUid', () => {
    it('returns expense when id and uid match', async () => {
      const fixture = new ExpenseFixture(dbService, userA.id);
      const inserted = await fixture.insert({
        name: 'Find me',
        value: 500,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const found = await repo.findByIdAndUserUid(inserted.id, userA.uid);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(inserted.id);
      expect(found!.name).toBe('Find me');
    });

    it('returns null when expense belongs to a different user', async () => {
      const fixture = new ExpenseFixture(dbService, userA.id);
      const inserted = await fixture.insert({
        name: 'Private',
        value: 500,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
      });

      const found = await repo.findByIdAndUserUid(inserted.id, userB.uid);
      expect(found).toBeNull();
    });

    it('returns null when expense does not exist', async () => {
      const found = await repo.findByIdAndUserUid(
        '00000000-0000-0000-0000-000000000000',
        userA.uid,
      );
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates all fields of an expense', async () => {
      const created = await repo.create(
        {
          name: 'Original',
          value: 1000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      const updated = await repo.update(
        created.id,
        {
          name: 'Updated',
          value: 2000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
          expense_category_id: category.id,
        },
        userA.uid,
        userA.email,
      );

      expect(updated.name).toBe('Updated');
      expect(updated.expense_category_id).toBe(category.id);
      expect(updated.modified_by).toBe(userA.email);
    });

    it('throws when expense belongs to another user', async () => {
      const created = await repo.create(
        {
          name: 'Private',
          value: 1000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      await expect(
        repo.update(
          created.id,
          {
            name: 'Stolen',
            value: 9999,
            currency_id: currency.id,
            expense_type_id: outcomeType.id,
          },
          userB.uid,
          userB.email,
        ),
      ).rejects.toThrow();
    });
  });

  describe('patch', () => {
    it('updates only provided fields', async () => {
      const created = await repo.create(
        {
          name: 'Original',
          value: 1000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      const patched = await repo.patch(
        created.id,
        { name: 'Patched' },
        userA.uid,
        userA.email,
      );

      expect(patched.name).toBe('Patched');
      expect(patched.currency_id).toBe(currency.id);
    });

    it('throws when expense belongs to another user', async () => {
      const created = await repo.create(
        {
          name: 'Private',
          value: 1000,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      await expect(
        repo.patch(created.id, { name: 'Stolen' }, userB.uid, userB.email),
      ).rejects.toThrow();
    });
  });

  describe('deleteByIdAndUserUid', () => {
    it('deletes the expense and it cannot be found after', async () => {
      const created = await repo.create(
        {
          name: 'Delete me',
          value: 100,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      await repo.deleteByIdAndUserUid(created.id, userA.uid);

      const found = await repo.findByIdAndUserUid(created.id, userA.uid);
      expect(found).toBeNull();
    });

    it('throws when expense belongs to another user', async () => {
      const created = await repo.create(
        {
          name: 'Private',
          value: 100,
          currency_id: currency.id,
          expense_type_id: outcomeType.id,
        },
        userA.uid,
        userA.email,
      );

      await expect(
        repo.deleteByIdAndUserUid(created.id, userB.uid),
      ).rejects.toThrow();
    });

    it('throws when expense does not exist', async () => {
      await expect(
        repo.deleteByIdAndUserUid(
          '00000000-0000-0000-0000-000000000000',
          userA.uid,
        ),
      ).rejects.toThrow();
    });
  });

  describe('filters', () => {
    async function seedFilterData() {
      const fixture = new ExpenseFixture(dbService, userA.id);
      await fixture.insert({
        name: 'Salary',
        value: 5000000,
        currency_id: currency.id,
        expense_type_id: incomeType.id,
      });
      await fixture.insert({
        name: 'Groceries',
        value: 150000,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
        expense_category_id: foodCategory.id,
      });
      await fixture.insert({
        name: 'Bus ticket',
        value: 3000,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
        expense_category_id: transportCategory.id,
      });
      await fixture.insert({
        name: 'Grocery delivery',
        value: 8000,
        currency_id: currency.id,
        expense_type_id: outcomeType.id,
        expense_category_id: foodCategory.id,
      });
    }

    it('filters by expense_type_id', async () => {
      await seedFilterData();

      const incomeResult = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        { expense_type_id: incomeType.id },
      );
      expect(incomeResult.data).toHaveLength(1);
      expect(incomeResult.data[0]!.name).toBe('Salary');

      const outcomeResult = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        { expense_type_id: outcomeType.id },
      );
      expect(outcomeResult.data).toHaveLength(3);
    });

    it('filters by expense_category_id', async () => {
      await seedFilterData();

      const result = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        { expense_category_id: transportCategory.id },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Bus ticket');
    });

    it('filters by name (ILIKE partial match, case-insensitive)', async () => {
      await seedFilterData();

      const result = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        { name: 'grocer' },
      );
      expect(result.data).toHaveLength(2);
      const names = result.data.map((e) => e.name);
      expect(names).toContain('Groceries');
      expect(names).toContain('Grocery delivery');
    });

    it('combines multiple filters with AND', async () => {
      await seedFilterData();

      const result = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        {
          expense_type_id: outcomeType.id,
          expense_category_id: foodCategory.id,
        },
      );
      expect(result.data).toHaveLength(2);
      result.data.forEach((e) => {
        expect(e.expense_type_id).toBe(outcomeType.id);
        expect(e.expense_category_id).toBe(foodCategory.id);
      });
    });

    it('combines all three filters', async () => {
      await seedFilterData();

      const result = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        {
          expense_type_id: outcomeType.id,
          expense_category_id: foodCategory.id,
          name: 'delivery',
        },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Grocery delivery');
    });

    it('returns empty when no expenses match filters', async () => {
      await seedFilterData();

      const result = await repo.findAllByUserUid(
        userA.uid,
        { limit: 20 },
        { name: 'nonexistent' },
      );
      expect(result.data).toEqual([]);
      expect(result.has_more).toBe(false);
      expect(result.total_count).toBe(0);
    });

    it('pagination works with active filters', async () => {
      await seedFilterData();

      const page1 = await repo.findAllByUserUid(
        userA.uid,
        { limit: 2 },
        { expense_type_id: outcomeType.id },
      );
      expect(page1.data).toHaveLength(2);
      expect(page1.has_more).toBe(true);
      expect(page1.total_count).toBe(3);

      const page2 = await repo.findAllByUserUid(
        userA.uid,
        { limit: 2, cursor: page1.next_cursor! },
        { expense_type_id: outcomeType.id },
      );
      expect(page2.data).toHaveLength(1);
      expect(page2.has_more).toBe(false);
    });

    it('countByUserUid respects filters', async () => {
      await seedFilterData();

      expect(await repo.countByUserUid(userA.uid)).toBe(4);
      expect(
        await repo.countByUserUid(userA.uid, {
          expense_type_id: incomeType.id,
        }),
      ).toBe(1);
      expect(
        await repo.countByUserUid(userA.uid, {
          expense_type_id: outcomeType.id,
        }),
      ).toBe(3);
      expect(
        await repo.countByUserUid(userA.uid, {
          expense_category_id: foodCategory.id,
        }),
      ).toBe(2);
      expect(await repo.countByUserUid(userA.uid, { name: 'grocer' })).toBe(2);
    });
  });
});
