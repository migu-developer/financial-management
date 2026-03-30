import { randomUUID } from 'node:crypto';
import { AbstractFactory } from './factory';

export interface UserInput {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: string;
}

export class UserFactory extends AbstractFactory<UserInput> {
  build(overrides?: Partial<UserInput>): UserInput {
    const id = randomUUID().slice(0, 8);
    return {
      uid: randomUUID(),
      email: `test-${id}@test.com`,
      first_name: 'Test',
      last_name: 'User',
      locale: 'en',
      ...overrides,
    };
  }
}
