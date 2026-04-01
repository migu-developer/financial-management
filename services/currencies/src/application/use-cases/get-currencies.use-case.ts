import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';

export class GetCurrenciesUseCase {
  constructor(private readonly repository: CurrencyRepository) {}

  async execute(): Promise<CurrencyEntity[]> {
    return this.repository.findAll();
  }
}
