import { SeederBase } from '@services/shared/test/fixtures/fixture.base';

export interface TestDocument {
  id: string;
  name: string;
}

export class DocumentSeeder extends SeederBase<TestDocument> {
  async seed(): Promise<TestDocument[]> {
    return this.dbService.query<TestDocument>(
      `INSERT INTO financial_management.documents (name) VALUES
         ('CC'),
         ('CE'),
         ('Passport'),
         ('NIT')
       RETURNING *`,
    );
  }
}
