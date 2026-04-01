import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';

export interface CurrencyRepository {
  findAll(): Promise<CurrencyEntity[]>;
}
