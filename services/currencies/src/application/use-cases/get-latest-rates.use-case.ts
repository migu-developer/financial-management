import type { LatestExchangeRate } from '@services/currencies/domain/entities/exchange-rate.entity';
import type { ExchangeRateRepository } from '@services/currencies/domain/repositories/exchange-rate.repository';

export class GetLatestRatesUseCase {
  constructor(private readonly repository: ExchangeRateRepository) {}

  async execute(): Promise<LatestExchangeRate[]> {
    return this.repository.findAllLatest();
  }
}
