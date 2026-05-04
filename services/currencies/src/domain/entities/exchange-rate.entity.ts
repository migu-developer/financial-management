export interface ExchangeRateEntity {
  id: string;
  currency_id: string;
  rate_to_usd: number;
  rate_date: string;
  source: string;
  created_at: string;
}

export interface LatestExchangeRate {
  currency_id: string;
  rate_to_usd: number;
  rate_date: string;
  source: string;
}
