import { Tracer } from '@aws-lambda-powertools/tracer';
import type { CurrencyEntity } from '@services/currencies/domain/entities/currency.entity';
import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

const tracer = new Tracer({ serviceName: 'currencies-repository' });

export class PostgresCurrencyRepository implements CurrencyRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @tracer.captureMethod({ subSegmentName: 'Currency:findAll' })
  async findAll(): Promise<CurrencyEntity[]> {
    return this.dbService.queryReadOnly<CurrencyEntity>(
      'SELECT id, code, name, symbol, country FROM financial_management.currencies ORDER BY code ASC',
    );
  }
}
