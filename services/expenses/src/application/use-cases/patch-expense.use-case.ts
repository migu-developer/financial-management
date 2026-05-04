import type { Expense, PatchExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';

export class PatchExpenseUseCase {
  constructor(
    private readonly repository: ExpenseRepository,
    private readonly conversionService: CurrencyConversionService,
  ) {}

  async execute(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    const needsConversion =
      input.value !== undefined || input.currency_id !== undefined;

    if (!needsConversion) {
      return this.repository.patch(id, input, uid, modifiedBy);
    }

    const current = await this.repository.findByIdAndUserUid(id, uid);
    if (!current) {
      return this.repository.patch(id, input, uid, modifiedBy);
    }

    const currencyId = input.currency_id ?? current.currency_id;
    const value = input.value ?? current.value;

    const globalValue = await this.conversionService.convert(currencyId, value);
    return this.repository.patch(id, input, uid, modifiedBy, globalValue);
  }
}
