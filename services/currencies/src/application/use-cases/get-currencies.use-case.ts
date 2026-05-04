import type { CurrencyWithRateEntity } from '@services/currencies/domain/entities/currency-with-rate.entity';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';

export class GetCurrenciesUseCase {
  constructor(private readonly repository: CurrencyRepository) {}

  async execute(): Promise<CurrencyWithRateEntity[]> {
    return this.repository.findAllWithLatestRates();
  }
}
