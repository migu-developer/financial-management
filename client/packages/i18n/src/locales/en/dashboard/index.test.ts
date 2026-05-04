import { dashboard } from './index';
import type { DashboardTranslation } from './index';

describe('en/dashboard namespace', () => {
  it('exports dashboard as an object', () => {
    expect(dashboard).toBeDefined();
    expect(typeof dashboard).toBe('object');
  });

  it('has required top-level keys', () => {
    expect(dashboard).toHaveProperty('home');
    expect(dashboard).toHaveProperty('expenses');
    expect(dashboard).toHaveProperty('metrics');
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

    it('all top-level expense values are non-empty strings', () => {
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

    it('all form values are non-empty strings', () => {
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

  describe('metrics namespace', () => {
    it('has required keys', () => {
      expect(dashboard.metrics).toHaveProperty('title');
      expect(dashboard.metrics).toHaveProperty('income');
      expect(dashboard.metrics).toHaveProperty('outcome');
      expect(dashboard.metrics).toHaveProperty('balance');
      expect(dashboard.metrics).toHaveProperty('transactions');
      expect(dashboard.metrics).toHaveProperty('avgTransaction');
      expect(dashboard.metrics).toHaveProperty('topExpenses');
      expect(dashboard.metrics).toHaveProperty('byCategory');
      expect(dashboard.metrics).toHaveProperty('byCurrency');
      expect(dashboard.metrics).toHaveProperty('dailyTrend');
      expect(dashboard.metrics).toHaveProperty('noData');
      expect(dashboard.metrics).toHaveProperty('allCategories');
      expect(dashboard.metrics).toHaveProperty('allCurrencies');
      expect(dashboard.metrics).toHaveProperty('allTypes');
      expect(dashboard.metrics).toHaveProperty('filterFrom');
      expect(dashboard.metrics).toHaveProperty('filterTo');
      expect(dashboard.metrics).toHaveProperty('globalCurrency');
      expect(dashboard.metrics).toHaveProperty('equivalent');
      expect(dashboard.metrics).toHaveProperty('byCategoryUsd');
      expect(dashboard.metrics).toHaveProperty('periodTotal');
    });

    it('all top-level metrics values are non-empty strings', () => {
      const metricsKeys = [
        'title',
        'income',
        'outcome',
        'balance',
        'transactions',
        'avgTransaction',
        'topExpenses',
        'byCategory',
        'byCurrency',
        'dailyTrend',
        'noData',
        'allCategories',
        'allCurrencies',
        'allTypes',
        'filterFrom',
        'filterTo',
        'globalCurrency',
        'equivalent',
        'byCategoryUsd',
        'periodTotal',
      ] as const;
      for (const key of metricsKeys) {
        const value = dashboard.metrics[key];
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
      }
    });

    it('has metrics.errors sub-keys', () => {
      expect(dashboard.metrics.errors).toHaveProperty('loadMetrics');
      expect(typeof dashboard.metrics.errors.loadMetrics).toBe('string');
      expect(dashboard.metrics.errors.loadMetrics.length).toBeGreaterThan(0);
    });

    it('has globalCurrency key', () => {
      expect(dashboard.metrics).toHaveProperty('globalCurrency');
      expect(dashboard.metrics.globalCurrency).toBe('USD');
    });

    it('equivalent contains value placeholder', () => {
      expect(dashboard.metrics.equivalent).toContain('{{value}}');
    });

    it('has byCategoryUsd key', () => {
      expect(dashboard.metrics).toHaveProperty('byCategoryUsd');
      expect(typeof dashboard.metrics.byCategoryUsd).toBe('string');
      expect(dashboard.metrics.byCategoryUsd.length).toBeGreaterThan(0);
    });

    it('has periodTotal key', () => {
      expect(dashboard.metrics).toHaveProperty('periodTotal');
      expect(typeof dashboard.metrics.periodTotal).toBe('string');
      expect(dashboard.metrics.periodTotal.length).toBeGreaterThan(0);
    });
  });

  it('satisfies the DashboardTranslation type', () => {
    const _typeCheck: DashboardTranslation = dashboard;
    expect(_typeCheck).toBe(dashboard);
  });
});
