import { dashboard } from './index';
import type { DashboardTranslation } from './index';

describe('es/dashboard namespace', () => {
  it('exports dashboard as an object', () => {
    expect(dashboard).toBeDefined();
    expect(typeof dashboard).toBe('object');
  });

  it('has required top-level keys', () => {
    expect(dashboard).toHaveProperty('home');
    expect(dashboard).toHaveProperty('expenses');
  });

  it('home has required keys', () => {
    expect(dashboard.home).toHaveProperty('title');
    expect(dashboard.home).toHaveProperty('underDevelopment');
    expect(dashboard.home).toHaveProperty('description');
  });

  describe('expenses namespace', () => {
    it('has top-level expense keys', () => {
      expect(dashboard.expenses).toHaveProperty('title');
      expect(dashboard.expenses).toHaveProperty('newExpense');
      expect(dashboard.expenses).toHaveProperty('editExpense');
      expect(dashboard.expenses).toHaveProperty('createExpense');
      expect(dashboard.expenses).toHaveProperty('deleteExpense');
      expect(dashboard.expenses).toHaveProperty('deleteConfirmMessage');
      expect(dashboard.expenses).toHaveProperty('emptyTitle');
      expect(dashboard.expenses).toHaveProperty('emptyDescription');
      expect(dashboard.expenses).toHaveProperty('totalExpenses');
      expect(dashboard.expenses).toHaveProperty('save');
      expect(dashboard.expenses).toHaveProperty('create');
      expect(dashboard.expenses).toHaveProperty('update');
      expect(dashboard.expenses).toHaveProperty('cancel');
      expect(dashboard.expenses).toHaveProperty('delete');
      expect(dashboard.expenses).toHaveProperty('loadMore');
      expect(dashboard.expenses).toHaveProperty('errorTitle');
      expect(dashboard.expenses).toHaveProperty('retry');
    });

    it('all top-level expense values are non-empty strings (Spanish translations exist)', () => {
      const topLevelKeys = [
        'title',
        'newExpense',
        'editExpense',
        'createExpense',
        'deleteExpense',
        'deleteConfirmMessage',
        'emptyTitle',
        'emptyDescription',
        'totalExpenses',
        'save',
        'create',
        'update',
        'cancel',
        'delete',
        'loadMore',
        'errorTitle',
        'retry',
      ] as const;
      for (const key of topLevelKeys) {
        const value = dashboard.expenses[key];
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      }
    });

    it('has expenses.form sub-keys', () => {
      expect(dashboard.expenses.form).toHaveProperty('name');
      expect(dashboard.expenses.form).toHaveProperty('namePlaceholder');
      expect(dashboard.expenses.form).toHaveProperty('value');
      expect(dashboard.expenses.form).toHaveProperty('valuePlaceholder');
      expect(dashboard.expenses.form).toHaveProperty('type');
      expect(dashboard.expenses.form).toHaveProperty('typePlaceholder');
      expect(dashboard.expenses.form).toHaveProperty('currency');
      expect(dashboard.expenses.form).toHaveProperty('currencyPlaceholder');
      expect(dashboard.expenses.form).toHaveProperty('category');
      expect(dashboard.expenses.form).toHaveProperty('categoryPlaceholder');
      expect(dashboard.expenses.form).toHaveProperty('categoryNone');
    });

    it('all form values are non-empty strings (Spanish translations exist)', () => {
      const formKeys = [
        'name',
        'namePlaceholder',
        'value',
        'valuePlaceholder',
        'type',
        'typePlaceholder',
        'currency',
        'currencyPlaceholder',
        'category',
        'categoryPlaceholder',
        'categoryNone',
      ] as const;
      for (const key of formKeys) {
        const value = dashboard.expenses.form[key];
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      }
    });

    it('has expenses.card sub-keys', () => {
      expect(dashboard.expenses.card).toHaveProperty('deleteAccessibility');
      expect(typeof dashboard.expenses.card.deleteAccessibility).toBe('string');
      expect(
        dashboard.expenses.card.deleteAccessibility.length,
      ).toBeGreaterThan(0);
    });

    it('has expenses.selector sub-keys', () => {
      expect(dashboard.expenses.selector).toHaveProperty('selectTitle');
      expect(dashboard.expenses.selector).toHaveProperty('done');
      expect(typeof dashboard.expenses.selector.selectTitle).toBe('string');
      expect(typeof dashboard.expenses.selector.done).toBe('string');
    });

    it('deleteConfirmMessage contains interpolation placeholder', () => {
      expect(dashboard.expenses.deleteConfirmMessage).toContain('{{name}}');
    });

    it('totalExpenses contains count placeholder', () => {
      expect(dashboard.expenses.totalExpenses).toContain('{{count}}');
    });

    it('selector.selectTitle contains field placeholder', () => {
      expect(dashboard.expenses.selector.selectTitle).toContain('{{field}}');
    });
  });

  it('satisfies the DashboardTranslation type', () => {
    const _typeCheck: DashboardTranslation = dashboard;
    expect(_typeCheck).toBe(dashboard);
  });
});
