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

const CATALOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  loadCatalogs: () => Promise<void>;
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
  const catalogsCachedAt = useRef<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const repository = useMemo(() => {
    const client = new ApiClient(apiBaseUrl, getToken);
    return new ExpenseApiRepository(client);
  }, [apiBaseUrl, getToken]);

  const clearError = useCallback(() => setError(null), []);

  const loadExpenses = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setInitialLoading(true);
    setError(null);
    try {
      const listUseCase = new ListExpensesUseCase(repository);
      const result = await listUseCase.execute(20);
      if (controller.signal.aborted) return;
      setExpenses(result.data);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
      if (result.total_count !== undefined) setTotalCount(result.total_count);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      if (!controller.signal.aborted) setInitialLoading(false);
    }
  }, [repository]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const listUseCase = new ListExpensesUseCase(repository);
      const result = await listUseCase.execute(20, nextCursor);
      setExpenses((prev) => [...prev, ...result.data]);
      setNextCursor(result.next_cursor);
      setHasMore(result.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, repository]);

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

  const loadCatalogs = useCallback(async () => {
    const now = Date.now();
    if (catalogsLoaded && now - catalogsCachedAt.current < CATALOG_CACHE_TTL)
      return;
    try {
      const [curr, types, cats] = await Promise.all([
        new ListCurrenciesUseCase(repository).execute(),
        new ListExpenseTypesUseCase(repository).execute(),
        new ListExpenseCategoriesUseCase(repository).execute(),
      ]);
      setCurrencies(curr);
      setExpenseTypes(types);
      setExpenseCategories(cats);
      setCatalogsLoaded(true);
      catalogsCachedAt.current = now;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalogs');
    }
  }, [catalogsLoaded, repository]);

  useEffect(() => {
    void loadExpenses();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadExpenses]);

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
      loadCatalogs,
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
      loadCatalogs,
    ],
  );

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}
