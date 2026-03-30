import type { DatabaseService } from '@services/shared/domain/services/database';
import type { AbstractFactory } from '@services/shared/test/factories/factory';

export abstract class FixtureBase<TInput, TOutput> {
  constructor(
    protected readonly dbService: DatabaseService,
    protected readonly factory: AbstractFactory<TInput>,
  ) {}

  abstract insert(overrides?: Partial<TInput>): Promise<TOutput>;

  async insertMany(
    count: number,
    overrides?: Partial<TInput>,
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.insert(overrides));
    }
    return results;
  }
}

export abstract class SeederBase<TOutput> {
  constructor(protected readonly dbService: DatabaseService) {}

  abstract seed(): Promise<TOutput[]>;
}
