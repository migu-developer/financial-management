import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';
import type { CurrencyWithRateEntity } from '@services/currencies/domain/entities/currency-with-rate.entity';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { trace } from '@services/shared/infrastructure/decorators/trace';

interface CurrencyWithRateRow {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country: string;
  rate_to_usd: number | null;
  rate_date: string | null;
}

export class PostgresCurrencyRepository implements CurrencyRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('Currency:findAll')
  async findAll(): Promise<CurrencyEntity[]> {
    return this.dbService.queryReadOnly<CurrencyEntity>(
      'SELECT id, code, name, symbol, country FROM financial_management.currencies ORDER BY code ASC',
    );
  }

  @trace('Currency:findAllWithLatestRates')
  async findAllWithLatestRates(): Promise<CurrencyWithRateEntity[]> {
    const rows = await this.dbService.queryReadOnly<CurrencyWithRateRow>(
      `SELECT
        c.id, c.code, c.name, c.symbol, c.country,
        er.rate_to_usd, er.rate_date
      FROM financial_management.currencies c
      LEFT JOIN financial_management.v_latest_exchange_rates er ON er.currency_id = c.id
      ORDER BY c.code ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      country: row.country,
      latest_rate:
        row.rate_to_usd !== null && row.rate_date !== null
          ? { rate_to_usd: Number(row.rate_to_usd), rate_date: row.rate_date }
          : null,
    }));
  }
}
