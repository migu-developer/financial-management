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
let outcomeType: TestExpenseType;
let category: TestExpenseCategory;

beforeAll(async () => {
  await dbService.createSchema();
  userFixture = new UserFixture(dbService);
  repo = new PostgresExpenseRepository(dbService);

  const catalogs = await seedAllCatalogs(dbService);
  currency = catalogs.currencies[0]!;
  outcomeType = catalogs.expenseTypes.find((t) => t.name === 'outcome')!;
  category = catalogs.expenseCategories[0]!;
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

      const page2 = await repo.findAllByUserUid(userA.uid, {
        limit: 2,
        cursor: page1.next_cursor!,
      });
      expect(page2.data).toHaveLength(1);
      expect(page2.has_more).toBe(false);
      expect(page2.next_cursor).toBeNull();
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
});
