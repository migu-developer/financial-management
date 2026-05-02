import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';
import type { CurrencyWithRateEntity } from '@services/currencies/domain/entities/currency-with-rate.entity';

export interface CurrencyRepository {
  findAll(): Promise<CurrencyEntity[]>;
  findAllWithLatestRates(): Promise<CurrencyWithRateEntity[]>;
}
