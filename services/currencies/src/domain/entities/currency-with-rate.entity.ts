import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';

export interface CurrencyWithRateEntity extends CurrencyEntity {
  latest_rate: {
    rate_to_usd: number;
    rate_date: string;
  } | null;
}
