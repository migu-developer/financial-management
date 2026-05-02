import type { DatabaseService } from '@services/shared/domain/services/database';

export interface TestExchangeRate {
  id: string;
  currency_id: string;
  rate_to_usd: number;
  rate_date: string;
  source: string;
  created_at: string;
}

interface ExchangeRateInput {
  currency_id: string;
  rate_to_usd: number;
  rate_date: string;
  source?: string;
}

export class ExchangeRateSeeder {
  constructor(private readonly dbService: DatabaseService) {}

  async seed(rates: ExchangeRateInput[]): Promise<TestExchangeRate[]> {
    const results: TestExchangeRate[] = [];
    for (const rate of rates) {
      const rows = await this.dbService.query<TestExchangeRate>(
        `INSERT INTO financial_management.exchange_rates (currency_id, rate_to_usd, rate_date, source)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          rate.currency_id,
          rate.rate_to_usd,
          rate.rate_date,
          rate.source ?? 'test',
        ],
      );
      results.push(rows[0]!);
    }
    return results;
  }
}
