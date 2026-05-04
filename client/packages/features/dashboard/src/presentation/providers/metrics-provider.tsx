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
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { ApiClient } from '@features/dashboard/infrastructure/api/api-client';
import { ExpenseApiRepository } from '@features/dashboard/infrastructure/api/expense-api-repository';
import { GetMetricsUseCase } from '@features/dashboard/application/use-cases/get-metrics.use-case';

export interface MetricsContextValue {
  metrics: MetricsResponse | null;
  loading: boolean;
  error: string | null;
  filters: MetricsFilters;
  setFilters: (filters: MetricsFilters) => void;
  refresh: () => Promise<void>;
}

const MetricsContext = createContext<MetricsContextValue | null>(null);

export function useMetrics(): MetricsContextValue {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error('useMetrics must be used within MetricsProvider');
  return ctx;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultFilters(): MetricsFilters {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return {
    from: formatDate(thirtyDaysAgo),
    to: formatDate(now),
  };
}

interface MetricsProviderProps {
  children: React.ReactNode;
  apiBaseUrl: string;
  getToken: () => Promise<string | null>;
}

export function MetricsProvider({
  children,
  apiBaseUrl,
  getToken,
}: MetricsProviderProps) {
  const { t } = useTranslation('dashboard');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] =
    useState<MetricsFilters>(getDefaultFilters);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const filtersRef = useRef<MetricsFilters>(filters);

  const repository = useMemo(() => {
    const client = new ApiClient(apiBaseUrl, getToken);
    return new ExpenseApiRepository(client);
  }, [apiBaseUrl, getToken]);

  const fetchMetrics = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const useCase = new GetMetricsUseCase(repository);
      const result = await useCase.execute(
        filtersRef.current,
        controller.signal,
      );
      if (controller.signal.aborted || !mountedRef.current) return;
      setMetrics(result);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : t('metrics.errors.loadMetrics'),
      );
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [repository, t]);

  const setFilters = useCallback(
    (newFilters: MetricsFilters) => {
      filtersRef.current = newFilters;
      setFiltersState(newFilters);
      void fetchMetrics();
    },
    [fetchMetrics],
  );

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchMetrics();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchMetrics]);

  const value = useMemo<MetricsContextValue>(
    () => ({
      metrics,
      loading,
      error,
      filters,
      setFilters,
      refresh,
    }),
    [metrics, loading, error, filters, setFilters, refresh],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}
