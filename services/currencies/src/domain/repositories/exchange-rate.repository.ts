import type { LatestExchangeRate } from '@services/currencies/domain/entities/exchange-rate.entity';

export interface UpsertRateInput {
  currency_id: string;
  rate_to_usd: number;
  rate_date: string;
  source: string;
}

export interface ExchangeRateRepository {
  upsertRates(rates: UpsertRateInput[]): Promise<void>;
  findLatestByCurrencyId(
    currencyId: string,
  ): Promise<LatestExchangeRate | null>;
  findAllLatest(): Promise<LatestExchangeRate[]>;
}
