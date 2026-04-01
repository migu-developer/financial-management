import { SeederBase } from '@services/shared/test/fixtures/fixture.base';

export interface TestCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country: string;
}

export class CurrencySeeder extends SeederBase<TestCurrency> {
  async seed(): Promise<TestCurrency[]> {
    return this.dbService.query<TestCurrency>(
      `INSERT INTO financial_management.currencies (code, name, symbol, country) VALUES
         ('COP', 'Peso Colombiano', '$', 'Colombia'),
         ('USD', 'US Dollar', '$', 'United States'),
         ('EUR', 'Euro', '€', 'Finland')
       RETURNING *`,
    );
  }
}
