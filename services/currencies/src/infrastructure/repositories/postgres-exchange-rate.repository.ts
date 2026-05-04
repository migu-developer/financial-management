import type { LatestExchangeRate } from '@services/currencies/domain/entities/exchange-rate.entity';
import type {
  ExchangeRateRepository,
  UpsertRateInput,
} from '@services/currencies/domain/repositories/exchange-rate.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { trace } from '@services/shared/infrastructure/decorators/trace';

export class PostgresExchangeRateRepository implements ExchangeRateRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('ExchangeRate:upsertRates')
  async upsertRates(rates: UpsertRateInput[]): Promise<void> {
    if (rates.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < rates.length; i++) {
      const offset = i * 4;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`,
      );
      const rate = rates[i]!;
      values.push(
        rate.currency_id,
        rate.rate_to_usd,
        rate.rate_date,
        rate.source,
      );
    }

    const sql = `
      INSERT INTO financial_management.exchange_rates (currency_id, rate_to_usd, rate_date, source)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (currency_id, rate_date)
      DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd, source = EXCLUDED.source
    `;

    await this.dbService.query(sql, values);
  }

  @trace('ExchangeRate:findLatestByCurrencyId')
  async findLatestByCurrencyId(
    currencyId: string,
  ): Promise<LatestExchangeRate | null> {
    const rows = await this.dbService.queryReadOnly<LatestExchangeRate>(
      `SELECT currency_id, rate_to_usd, rate_date, source
       FROM financial_management.exchange_rates
       WHERE currency_id = $1
       ORDER BY rate_date DESC
       LIMIT 1`,
      [currencyId],
    );
    return rows[0] ?? null;
  }

  @trace('ExchangeRate:findAllLatest')
  async findAllLatest(): Promise<LatestExchangeRate[]> {
    return this.dbService.queryReadOnly<LatestExchangeRate>(
      'SELECT currency_id, rate_to_usd, rate_date, source FROM financial_management.v_latest_exchange_rates',
    );
  }
}
