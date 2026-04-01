import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

export class PostgresCurrencyRepository implements CurrencyRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(): Promise<CurrencyEntity[]> {
    return this.dbService.queryReadOnly<CurrencyEntity>(
      'SELECT id, code, name, symbol, country FROM financial_management.currencies ORDER BY code ASC',
    );
  }
}
