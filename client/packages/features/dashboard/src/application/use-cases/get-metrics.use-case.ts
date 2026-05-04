import type {
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class GetMetricsUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(
    filters: MetricsFilters,
    signal?: AbortSignal,
  ): Promise<MetricsResponse> {
    return this.repository.getMetrics(filters, signal);
  }
}
