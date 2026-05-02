import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';

export class UpdateExpenseUseCase {
  constructor(
    private readonly repository: ExpenseRepository,
    private readonly conversionService: CurrencyConversionService,
  ) {}

  async execute(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    const globalValue = await this.conversionService.convert(
      input.currency_id,
      input.value,
    );
    return this.repository.update(id, input, uid, modifiedBy, globalValue);
  }
}
