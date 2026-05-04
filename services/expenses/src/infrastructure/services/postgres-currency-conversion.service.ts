import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { trace } from '@services/shared/infrastructure/decorators/trace';

interface ExchangeRateRow {
  rate_to_usd: number;
}

export class PostgresCurrencyConversionService implements CurrencyConversionService {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('CurrencyConversion:convert')
  async convert(currencyId: string, value: number): Promise<number | null> {
    const rows = await this.dbService.queryReadOnly<ExchangeRateRow>(
      `SELECT rate_to_usd
       FROM financial_management.v_latest_exchange_rates
       WHERE currency_id = $1`,
      [currencyId],
    );

    const rate = rows[0];
    if (!rate) return null;

    return value / Number(rate.rate_to_usd);
  }
}
