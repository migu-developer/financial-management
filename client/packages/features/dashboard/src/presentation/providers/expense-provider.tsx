import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Expense,
  CreateExpenseInput,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import { createCache, DEFAULT_CACHE_TTL } from '@packages/utils';
import { ApiClient } from '@features/dashboard/infrastructure/api/api-client';
import { ExpenseApiRepository } from '@features/dashboard/infrastructure/api/expense-api-repository';
import { ListExpensesUseCase } from '@features/dashboard/application/use-cases/list-expenses.use-case';
import { CreateExpenseUseCase } from '@features/dashboard/application/use-cases/create-expense.use-case';
import { UpdateExpenseUseCase } from '@features/dashboard/application/use-cases/update-expense.use-case';
import { DeleteExpenseUseCase } from '@features/dashboard/application/use-cases/delete-expense.use-case';
import {
  ListCurrenciesUseCase,
  ListExpenseTypesUseCase,
  ListExpenseCategoriesUseCase,
} from '@features/dashboard/application/use-cases/list-catalogs.use-case';

const currenciesCache = createCache<Currency[]>(
  'cache:currencies',
  DEFAULT_CACHE_TTL,
);
const expenseTypesCache = createCache<ExpenseType[]>(
  'cache:expense-types',
  DEFAULT_CACHE_TTL,
);
const expenseCategoriesCache = createCache<ExpenseCategory[]>(
  'cache:expense-categories',
  DEFAULT_CACHE_TTL,
);

export interface ExpenseContextValue {
  expenses: Expense[];
  totalCount: number | null;
  hasMore: boolean;
  initialLoading: boolean;
  loadingMore: boolean;
  error: string | null;
  currencies: Currency[];
  expenseTypes: ExpenseType[];
  expenseCategories: ExpenseCategory[];
  catalogsLoaded: boolean;
  clearError: () => void;
  loadExpenses: () => Promise<void>;
  loadMore: () => Promise<void>;
  createExpense: (input: Omit<CreateExpenseInput, 'user_id'>) => Promise<void>;
  updateExpense: (
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpenseProvider');
  return ctx;
}

interface ExpenseProviderProps {
  children: React.ReactNode;
  apiBaseUrl: string;
  getToken: () => Promise<string | null>;
}

export function ExpenseProvider({
  children,
  apiBaseUrl,
  getToken,
}: ExpenseProviderProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  const expensesAbortRef = useRef<AbortController | null>(null);
  const catalogsAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const repository = useMemo(() => {
    const client = new ApiClient(apiBaseUrl, getToken);
    return new ExpenseApiRepository(client);
  }, [apiBaseUrl, getToken]);

  const clearError = useCallback(() => setError(null), []);

  const loadExpenses = useCallback(async () => {
    expensesAbortRef.current?.abort();
    const controller = new AbortController();
    expensesAbortRef.current = controller;

    setInitialLoading(true);
    setError(null);
    try {
      const listUseCase = new ListExpensesUseCase(repository);
      const result = await listUseCase.execute(20);
      if (controller.signal.aborted || !mountedRef.current) return;
      setExpenses(result.data);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
      if (result.total_count !== undefined) setTotalCount(result.total_count);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      if (!controller.signal.aborted && mountedRef.current)
        setInitialLoading(false);
    }
  }, [repository]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const listUseCase = new ListExpensesUseCase(repository);
      const result = await listUseCase.execute(20, nextCursor);
      if (!mountedRef.current) return;
      setExpenses((prev) => [...prev, ...result.data]);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, repository]);

  const loadCatalogs = useCallback(async () => {
    catalogsAbortRef.current?.abort();
    const controller = new AbortController();
    catalogsAbortRef.current = controller;

    try {
      // Try persistent cache first (AsyncStorage — survives navigation + reload)
      const [cachedCurr, cachedTypes, cachedCats] = await Promise.all([
        currenciesCache.get(),
        expenseTypesCache.get(),
        expenseCategoriesCache.get(),
      ]);

      if (cachedCurr && cachedTypes && cachedCats) {
        if (controller.signal.aborted || !mountedRef.current) return;
        setCurrencies(cachedCurr);
        setExpenseTypes(cachedTypes);
        setExpenseCategories(cachedCats);
        setCatalogsLoaded(true);
        return;
      }

      // Cache miss or expired — fetch from API
      const [curr, types, cats] = await Promise.all([
        new ListCurrenciesUseCase(repository).execute(),
        new ListExpenseTypesUseCase(repository).execute(),
        new ListExpenseCategoriesUseCase(repository).execute(),
      ]);
      if (controller.signal.aborted || !mountedRef.current) return;

      setCurrencies(curr);
      setExpenseTypes(types);
      setExpenseCategories(cats);
      setCatalogsLoaded(true);

      // Persist to cache (fire and forget — does not block render)
      void Promise.all([
        currenciesCache.set(curr),
        expenseTypesCache.set(types),
        expenseCategoriesCache.set(cats),
      ]);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load catalogs');
    }
  }, [repository]);

  const createExpense = useCallback(
    async (input: Omit<CreateExpenseInput, 'user_id'>) => {
      const useCase = new CreateExpenseUseCase(repository);
      await useCase.execute(input);
      await loadExpenses();
    },
    [repository, loadExpenses],
  );

  const updateExpense = useCallback(
    async (id: string, input: Omit<CreateExpenseInput, 'user_id'>) => {
      const useCase = new UpdateExpenseUseCase(repository);
      await useCase.execute(id, input);
      await loadExpenses();
    },
    [repository, loadExpenses],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const useCase = new DeleteExpenseUseCase(repository);
      await useCase.execute(id);
      await loadExpenses();
    },
    [repository, loadExpenses],
  );

  useEffect(() => {
    mountedRef.current = true;
    void Promise.all([loadExpenses(), loadCatalogs()]);
    return () => {
      mountedRef.current = false;
      expensesAbortRef.current?.abort();
      catalogsAbortRef.current?.abort();
    };
  }, [loadExpenses, loadCatalogs]);

  const value = useMemo<ExpenseContextValue>(
    () => ({
      expenses,
      totalCount,
      hasMore,
      initialLoading,
      loadingMore,
      error,
      currencies,
      expenseTypes,
      expenseCategories,
      catalogsLoaded,
      clearError,
      loadExpenses,
      loadMore,
      createExpense,
      updateExpense,
      deleteExpense,
    }),
    [
      expenses,
      totalCount,
      hasMore,
      initialLoading,
      loadingMore,
      error,
      currencies,
      expenseTypes,
      expenseCategories,
      catalogsLoaded,
      clearError,
      loadExpenses,
      loadMore,
      createExpense,
      updateExpense,
      deleteExpense,
    ],
  );

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}
