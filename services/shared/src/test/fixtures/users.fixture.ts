import type { DatabaseService } from '@services/shared/domain/services/database';
import { FixtureBase } from './fixture.base';
import { UserFactory, type UserInput } from '../factories/user.factory';

export interface TestUser {
  id: string;
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export class UserFixture extends FixtureBase<UserInput, TestUser> {
  constructor(dbService: DatabaseService) {
    super(dbService, new UserFactory());
  }

  async insert(overrides?: Partial<UserInput>): Promise<TestUser> {
    const data = this.factory.build(overrides);
    const rows = await this.dbService.query<TestUser>(
      `INSERT INTO financial_management.users (uid, email, first_name, last_name, locale, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [
        data.uid,
        data.email,
        data.first_name,
        data.last_name,
        data.locale,
        data.email,
      ],
    );
    return rows[0]!;
  }
}
