import type {
  MetricsFilters,
  MetricsResponse,
} from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class GetMetricsUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    uid: string,
    filters: MetricsFilters,
  ): Promise<MetricsResponse> {
    const metrics = await this.repository.getMetrics(uid, filters);
    return {
      period: { from: filters.from, to: filters.to },
      ...metrics,
    };
  }
}
